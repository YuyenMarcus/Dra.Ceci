-- ============================================================================
-- MedTrack — Phase 1 foundation: real auth + multi-tenant schema
-- Project: https://dtlljwvaggyaalzspkzm.supabase.co
--
-- Run this in the Supabase SQL Editor. It REPLACES the demo schema in
-- schema.sql (which kept plain-text passwords and open policies).
--
-- Model:
--   * Tenant = clinic, owned by one Supabase Auth user (the doctor).
--   * Doctors/staff authenticate via Supabase Auth (no password column).
--   * Patients are clinic-owned records; an optional user_id links a record
--     to a real patient account so a logged-in patient can see every clinic
--     they belong to.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists clinics (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null unique references auth.users(id) on delete cascade,
  slug         text not null unique,
  name         text not null,                 -- the doctor's display name
  specialty    text not null default '',
  clinic_name  text not null default '',
  email        text not null default '',
  phone        text not null default '',
  address      text not null default '',
  city         text not null default '',
  map_query    text not null default '',
  working_days integer[] not null default '{1,2,3,4,5}',
  start_hour   integer not null default 9,
  end_hour     integer not null default 17,
  slot_minutes integer not null default 30,
  created_at   timestamptz not null default now()
);

create table if not exists patients (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references clinics(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete set null, -- optional patient account
  name        text not null,
  email       text not null default '',
  phone       text not null default '',
  data        jsonb not null default '{}',     -- full ficha (history, odontogram, etc.)
  created_at  timestamptz not null default now()
);

create table if not exists inventory (
  id            uuid primary key default gen_random_uuid(),
  clinic_id     uuid not null references clinics(id) on delete cascade,
  name          text not null,
  category      text not null default '',
  sku           text not null default '',
  quantity      integer not null default 0,
  unit          text not null default '',
  reorder_level integer not null default 0,
  supplier      text not null default '',
  updated_at    timestamptz not null default now()
);

create table if not exists appointments (
  id            uuid primary key default gen_random_uuid(),
  clinic_id     uuid not null references clinics(id) on delete cascade,
  patient_id    uuid references patients(id) on delete set null,
  provider      text not null default '',
  patient_name  text,
  patient_phone text,
  patient_email text not null default '',
  reason        text not null default '',
  notes         text not null default '',
  start         timestamptz not null,
  duration_min  integer not null default 30,
  status        text not null default 'scheduled',
  source        text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_clinics_slug          on clinics(slug);
create index if not exists idx_patients_clinic        on patients(clinic_id);
create index if not exists idx_patients_user          on patients(user_id);
create index if not exists idx_inventory_clinic       on inventory(clinic_id);
create index if not exists idx_appointments_clinic    on appointments(clinic_id);
create index if not exists idx_appointments_patient   on appointments(patient_id);
create index if not exists idx_appointments_start     on appointments(start);
create index if not exists idx_appointments_status    on appointments(status);

-- ---------------------------------------------------------------------------
-- Helper: does the current auth user own this clinic?
-- ---------------------------------------------------------------------------
create or replace function is_clinic_owner(cid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from clinics c
    where c.id = cid and c.owner_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table clinics      enable row level security;
alter table patients     enable row level security;
alter table inventory    enable row level security;
alter table appointments enable row level security;

-- Clinics: public profiles are readable by anyone; only the owner can write.
drop policy if exists clinics_public_read on clinics;
create policy clinics_public_read on clinics
  for select using (true);

drop policy if exists clinics_owner_insert on clinics;
create policy clinics_owner_insert on clinics
  for insert with check (owner_id = auth.uid());

drop policy if exists clinics_owner_update on clinics;
create policy clinics_owner_update on clinics
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists clinics_owner_delete on clinics;
create policy clinics_owner_delete on clinics
  for delete using (owner_id = auth.uid());

-- Patients: clinic owner has full access; a linked patient can read their own.
drop policy if exists patients_owner_all on patients;
create policy patients_owner_all on patients
  for all using (is_clinic_owner(clinic_id)) with check (is_clinic_owner(clinic_id));

drop policy if exists patients_self_read on patients;
create policy patients_self_read on patients
  for select using (user_id = auth.uid());

-- Inventory: clinic owner only.
drop policy if exists inventory_owner_all on inventory;
create policy inventory_owner_all on inventory
  for all using (is_clinic_owner(clinic_id)) with check (is_clinic_owner(clinic_id));

-- Appointments: clinic owner full access; linked patient can read their own.
drop policy if exists appointments_owner_all on appointments;
create policy appointments_owner_all on appointments
  for all using (is_clinic_owner(clinic_id)) with check (is_clinic_owner(clinic_id));

drop policy if exists appointments_self_read on appointments;
create policy appointments_self_read on appointments
  for select using (
    patient_id in (select id from patients where user_id = auth.uid())
  );

-- NOTE: anon (public) users get NO direct table access. Public booking and
-- availability go through the SECURITY DEFINER functions below.

-- ---------------------------------------------------------------------------
-- Public, PII-safe RPCs for the booking flow
-- ---------------------------------------------------------------------------

-- Public clinic profile by slug (no patient data).
create or replace function public_clinic_by_slug(p_slug text)
returns table (
  id uuid, slug text, name text, specialty text, clinic_name text,
  phone text, address text, city text, map_query text,
  working_days integer[], start_hour integer, end_hour integer, slot_minutes integer
)
language sql
security definer
stable
set search_path = public
as $$
  select id, slug, name, specialty, clinic_name, phone, address, city, map_query,
         working_days, start_hour, end_hour, slot_minutes
  from clinics
  where slug = p_slug;
$$;

-- Busy slots in a window (start + duration only; no names/phones).
create or replace function public_taken_slots(p_clinic_id uuid, p_from timestamptz, p_to timestamptz)
returns table (start timestamptz, duration_min integer)
language sql
security definer
stable
set search_path = public
as $$
  select a.start, a.duration_min
  from appointments a
  where a.clinic_id = p_clinic_id
    and a.status = 'scheduled'
    and a.start >= p_from
    and a.start <  p_to;
$$;

-- Conflict-checked public booking with server-side guardrails.
-- Returns jsonb: { ok: bool, error?: text, appointment_id?: uuid }.
create or replace function request_appointment(
  p_clinic_id     uuid,
  p_patient_name  text,
  p_patient_phone text,
  p_patient_email text,
  p_reason        text,
  p_notes         text,
  p_start         timestamptz,
  p_duration_min  integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone_digits text := regexp_replace(coalesce(p_patient_phone, ''), '\D', '', 'g');
  v_dur integer := coalesce(nullif(p_duration_min, 0), 30);
  v_end timestamptz := p_start + make_interval(mins => v_dur);
  v_upcoming integer;
  v_overlap integer;
  v_conflict integer;
  v_provider text;
  v_patient_id uuid;
  v_appt_id uuid;
  c_max_upcoming constant integer := 3;
begin
  if length(v_phone_digits) < 7 then
    return jsonb_build_object('ok', false, 'error', 'err.validPhone');
  end if;
  if coalesce(btrim(p_patient_name), '') = '' then
    return jsonb_build_object('ok', false, 'error', 'err.enterName');
  end if;
  if not exists (select 1 from clinics where id = p_clinic_id) then
    return jsonb_build_object('ok', false, 'error', 'err.incorrectLogin');
  end if;

  -- Guardrail 1: cap concurrent upcoming bookings for this phone (this clinic).
  select count(*) into v_upcoming
  from appointments a
  where a.clinic_id = p_clinic_id
    and a.status = 'scheduled'
    and a.start >= now()
    and regexp_replace(coalesce(a.patient_phone, ''), '\D', '', 'g') = v_phone_digits;
  if v_upcoming >= c_max_upcoming then
    return jsonb_build_object('ok', false, 'error', 'err.maxUpcoming');
  end if;

  -- Guardrail 2: same phone can't overlap itself.
  select count(*) into v_overlap
  from appointments a
  where a.clinic_id = p_clinic_id
    and a.status = 'scheduled'
    and regexp_replace(coalesce(a.patient_phone, ''), '\D', '', 'g') = v_phone_digits
    and a.start < v_end
    and (a.start + make_interval(mins => a.duration_min)) > p_start;
  if v_overlap > 0 then
    return jsonb_build_object('ok', false, 'error', 'err.alreadyAtTime');
  end if;

  -- Guardrail 3: protect the clinic calendar from double-booking.
  select count(*) into v_conflict
  from appointments a
  where a.clinic_id = p_clinic_id
    and a.status = 'scheduled'
    and a.start < v_end
    and (a.start + make_interval(mins => a.duration_min)) > p_start;
  if v_conflict > 0 then
    return jsonb_build_object('ok', false, 'error', 'err.timeTaken');
  end if;

  select name into v_provider from clinics where id = p_clinic_id;

  -- Link to an existing patient record by phone, else create one.
  select id into v_patient_id
  from patients
  where clinic_id = p_clinic_id
    and regexp_replace(coalesce(phone, ''), '\D', '', 'g') = v_phone_digits
  limit 1;

  if v_patient_id is null then
    insert into patients (clinic_id, name, email, phone, data)
    values (p_clinic_id, btrim(p_patient_name), coalesce(p_patient_email, ''),
            p_patient_phone, jsonb_build_object('notes', 'Created from online booking.'))
    returning id into v_patient_id;
  end if;

  insert into appointments (
    clinic_id, patient_id, provider, patient_name, patient_phone, patient_email,
    reason, notes, start, duration_min, status, source
  ) values (
    p_clinic_id, v_patient_id, v_provider, btrim(p_patient_name), p_patient_phone,
    coalesce(p_patient_email, ''), coalesce(nullif(btrim(p_reason), ''), 'Online booking'),
    coalesce(p_notes, ''), p_start, v_dur, 'scheduled', 'public'
  ) returning id into v_appt_id;

  return jsonb_build_object('ok', true, 'appointment_id', v_appt_id);
end;
$$;

-- Look up a phone's upcoming bookings at a clinic (manage flow). Phone acts as
-- the shared secret; only minimal fields are returned.
create or replace function public_bookings_by_phone(p_clinic_id uuid, p_phone text)
returns table (
  id uuid, reason text, notes text, start timestamptz,
  duration_min integer, status text, provider text
)
language sql
security definer
stable
set search_path = public
as $$
  select a.id, a.reason, a.notes, a.start, a.duration_min, a.status, a.provider
  from appointments a
  where a.clinic_id = p_clinic_id
    and regexp_replace(coalesce(a.patient_phone, ''), '\D', '', 'g')
        = regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')
  order by a.start desc;
$$;

-- Cancel a booking, but only if the supplied phone matches the booking.
create or replace function public_cancel_appointment(p_appointment_id uuid, p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match integer;
begin
  update appointments
  set status = 'cancelled'
  where id = p_appointment_id
    and status = 'scheduled'
    and regexp_replace(coalesce(patient_phone, ''), '\D', '', 'g')
        = regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  get diagnostics v_match = row_count;
  if v_match = 0 then
    return jsonb_build_object('ok', false, 'error', 'err.cannotCancel');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- Let unauthenticated visitors call only these controlled functions.
grant execute on function public_clinic_by_slug(text)               to anon, authenticated;
grant execute on function public_taken_slots(uuid, timestamptz, timestamptz) to anon, authenticated;
grant execute on function request_appointment(uuid, text, text, text, text, text, timestamptz, integer) to anon, authenticated;
grant execute on function public_bookings_by_phone(uuid, text)      to anon, authenticated;
grant execute on function public_cancel_appointment(uuid, text)     to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Auto-provision a clinic when a doctor signs up.
-- The app sends user metadata { role: 'doctor', name, slug } on sign-up.
-- ---------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := coalesce(new.raw_user_meta_data->>'role', 'patient');
  v_name text := coalesce(nullif(btrim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1));
  v_base text := coalesce(nullif(btrim(new.raw_user_meta_data->>'slug'), ''), lower(regexp_replace(v_name, '[^a-zA-Z0-9]+', '-', 'g')));
  v_slug text;
  v_try integer := 0;
begin
  if v_role <> 'doctor' then
    return new;  -- patients don't get a clinic
  end if;

  v_base := btrim(v_base, '-');
  if v_base = '' then v_base := 'clinic'; end if;
  v_slug := v_base;
  while exists (select 1 from clinics where slug = v_slug) loop
    v_try := v_try + 1;
    v_slug := v_base || '-' || v_try;
  end loop;

  insert into clinics (owner_id, slug, name, email)
  values (new.id, v_slug, v_name, coalesce(new.email, ''));

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
