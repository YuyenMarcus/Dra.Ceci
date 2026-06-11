-- ============================================================================
-- 0019_locations.sql — Multiple locations (branches) per clinic.
--
-- A clinic can have several physical branches, each with its own address, map
-- pin, display hours and BOOKING SCHEDULE (working days + open hours + slot
-- size). Appointments gain an optional `location_id`; when a clinic has
-- locations, online booking is scoped per branch (each branch keeps its own
-- calendar / availability). Clinics with NO location rows keep the legacy
-- single-calendar behavior unchanged (location_id stays null).
--
-- Managing locations is a Profesional+ feature (gated client-side via the
-- `multiLocation` capability); the schema itself is tier-agnostic.
--
-- Run in the Supabase SQL Editor after 0018.
-- ============================================================================

create table if not exists clinic_locations (
  id           uuid primary key default gen_random_uuid(),
  clinic_id    uuid not null references clinics(id) on delete cascade,
  name         text not null default '',
  address      text not null default '',
  city         text not null default '',
  phone        text not null default '',
  map_query    text not null default '',
  lat          double precision,
  lng          double precision,
  hours        text not null default '',
  working_days integer[] not null default '{1,2,3,4,5}',
  start_hour   integer not null default 9,
  end_hour     integer not null default 17,
  slot_minutes integer not null default 30,
  sort_order   integer not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create index if not exists idx_clinic_locations_clinic on clinic_locations(clinic_id);

alter table appointments
  add column if not exists location_id uuid references clinic_locations(id) on delete set null;
create index if not exists idx_appointments_location on appointments(location_id);

-- ---------------------------------------------------------------------------
-- RLS: only the clinic owner manages its locations (gated by trial/billing
-- access like other clinic-scoped tables). Anonymous visitors never read the
-- table directly — the public profile / booking flow goes through the
-- SECURITY DEFINER RPC below, which only exposes active branches.
-- ---------------------------------------------------------------------------
alter table clinic_locations enable row level security;

drop policy if exists clinic_locations_owner_all on clinic_locations;
create policy clinic_locations_owner_all on clinic_locations
  for all
  using (is_clinic_owner(clinic_id) and clinic_access_ok(clinic_id))
  with check (is_clinic_owner(clinic_id) and clinic_access_ok(clinic_id));

-- ---------------------------------------------------------------------------
-- Public: active branches for a clinic (used by the booking picker and the
-- public profile). No PII beyond what the profile already shows publicly.
-- ---------------------------------------------------------------------------
create or replace function public_clinic_locations(p_clinic_id uuid)
returns table (
  id uuid, name text, address text, city text, phone text, map_query text,
  lat double precision, lng double precision, hours text,
  working_days integer[], start_hour integer, end_hour integer, slot_minutes integer
)
language sql security definer stable set search_path = public
as $$
  select id, name, address, city, phone, map_query, lat, lng, hours,
         working_days, start_hour, end_hour, slot_minutes
  from clinic_locations
  where clinic_id = p_clinic_id and active = true
  order by sort_order asc, created_at asc;
$$;
grant execute on function public_clinic_locations(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Booking availability: optionally scope busy slots to one branch so each
-- branch has an independent calendar. (Drops the 3-arg version and replaces it
-- with a 4-arg one defaulting location to null = clinic-wide / legacy.)
-- ---------------------------------------------------------------------------
drop function if exists public_taken_slots(uuid, timestamptz, timestamptz);
create or replace function public_taken_slots(
  p_clinic_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_location_id uuid default null
)
returns table (start timestamptz, duration_min integer)
language sql security definer stable set search_path = public
as $$
  select a.start, a.duration_min
  from appointments a
  where a.clinic_id = p_clinic_id
    and a.status = 'scheduled'
    and a.start >= p_from
    and a.start <  p_to
    and (p_location_id is null or a.location_id = p_location_id);
$$;
grant execute on function public_taken_slots(uuid, timestamptz, timestamptz, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Public booking with an optional branch. Per-branch calendar conflict (the
-- capacity guardrail) is scoped to the chosen location; the per-phone
-- guardrails stay clinic-wide so a patient can't double-book themselves across
-- branches at the same time. (New 9-arg signature; the old 8-arg is dropped.)
-- ---------------------------------------------------------------------------
drop function if exists request_appointment(uuid, text, text, text, text, text, timestamptz, integer);
create or replace function request_appointment(
  p_clinic_id     uuid,
  p_patient_name  text,
  p_patient_phone text,
  p_patient_email text,
  p_reason        text,
  p_notes         text,
  p_start         timestamptz,
  p_duration_min  integer,
  p_location_id   uuid default null
)
returns jsonb
language plpgsql security definer set search_path = public
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
  -- A supplied branch must belong to this clinic.
  if p_location_id is not null and not exists (
    select 1 from clinic_locations where id = p_location_id and clinic_id = p_clinic_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'err.incorrectLogin');
  end if;

  -- Guardrail 1: cap concurrent upcoming bookings for this phone (clinic-wide).
  select count(*) into v_upcoming
  from appointments a
  where a.clinic_id = p_clinic_id
    and a.status = 'scheduled'
    and a.start >= now()
    and regexp_replace(coalesce(a.patient_phone, ''), '\D', '', 'g') = v_phone_digits;
  if v_upcoming >= c_max_upcoming then
    return jsonb_build_object('ok', false, 'error', 'err.maxUpcoming');
  end if;

  -- Guardrail 2: same phone can't overlap itself (clinic-wide, any branch).
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

  -- Guardrail 3: protect the calendar from double-booking, scoped to the
  -- chosen branch when one is given (each branch is its own calendar).
  select count(*) into v_conflict
  from appointments a
  where a.clinic_id = p_clinic_id
    and a.status = 'scheduled'
    and (p_location_id is null or a.location_id = p_location_id)
    and a.start < v_end
    and (a.start + make_interval(mins => a.duration_min)) > p_start;
  if v_conflict > 0 then
    return jsonb_build_object('ok', false, 'error', 'err.timeTaken');
  end if;

  select name into v_provider from clinics where id = p_clinic_id;

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
    clinic_id, location_id, patient_id, provider, patient_name, patient_phone,
    patient_email, reason, notes, start, duration_min, status, source
  ) values (
    p_clinic_id, p_location_id, v_patient_id, v_provider, btrim(p_patient_name),
    p_patient_phone, coalesce(p_patient_email, ''),
    coalesce(nullif(btrim(p_reason), ''), 'Online booking'),
    coalesce(p_notes, ''), p_start, v_dur, 'scheduled', 'public'
  ) returning id into v_appt_id;

  return jsonb_build_object('ok', true, 'appointment_id', v_appt_id);
end;
$$;
grant execute on function request_appointment(uuid, text, text, text, text, text, timestamptz, integer, uuid) to anon, authenticated;
