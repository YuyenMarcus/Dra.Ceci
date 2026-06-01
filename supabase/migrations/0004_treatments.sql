-- ============================================================================
-- MedTrack — Clinical treatment timeline + informed consent
-- Run after 0001–0003 in the Supabase SQL Editor.
--
-- Patients NEVER get direct SELECT on these tables. All patient/public reads
-- go through SECURITY DEFINER RPCs that return only safe columns.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- treatments — shared clinical log (doctor writes, patients read via RPC)
-- ---------------------------------------------------------------------------
create table if not exists treatments (
  id                uuid primary key default gen_random_uuid(),
  clinic_id         uuid not null references clinics(id) on delete cascade,
  patient_id        uuid not null references patients(id) on delete cascade,
  treatment_date    date not null default current_date,
  provider          text not null default '',
  tooth             text,
  procedure         text not null default '',
  follow_up         text not null default '',
  patient_note      text not null default '',
  private_note      text not null default '',
  status            text not null default 'completed'
                    check (status in ('planned', 'completed')),
  amount            numeric(12, 2) not null default 0,
  paid              boolean not null default false,
  materials         jsonb not null default '[]'::jsonb,
  odontogram_status text,
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_treatments_clinic   on treatments(clinic_id);
create index if not exists idx_treatments_patient  on treatments(patient_id);
create index if not exists idx_treatments_date     on treatments(treatment_date desc);

alter table treatments enable row level security;

drop policy if exists treatments_owner_all on treatments;
create policy treatments_owner_all on treatments
  for all using (is_clinic_owner(clinic_id))
  with check (is_clinic_owner(clinic_id));

-- ---------------------------------------------------------------------------
-- consent_records — digital informed consent (doctor-only write; patient RPC)
-- ---------------------------------------------------------------------------
create table if not exists consent_records (
  id           uuid primary key default gen_random_uuid(),
  clinic_id    uuid not null references clinics(id) on delete cascade,
  patient_id   uuid not null references patients(id) on delete cascade,
  treatment_id uuid references treatments(id) on delete set null,
  procedure    text not null default '',
  body         text not null default '',
  signed_name  text not null default '',
  signed_at    timestamptz not null default now(),
  created_by   uuid references auth.users(id) on delete set null
);

create index if not exists idx_consents_clinic  on consent_records(clinic_id);
create index if not exists idx_consents_patient on consent_records(patient_id);

alter table consent_records enable row level security;

drop policy if exists consents_owner_all on consent_records;
create policy consents_owner_all on consent_records
  for all using (is_clinic_owner(clinic_id))
  with check (is_clinic_owner(clinic_id));

-- ---------------------------------------------------------------------------
-- Patient-safe reads (no private_note, amount, paid, materials)
-- ---------------------------------------------------------------------------

create or replace function my_treatments()
returns table (
  id uuid,
  clinic_id uuid,
  clinic_name text,
  clinic_slug text,
  treatment_date date,
  provider text,
  tooth text,
  procedure text,
  follow_up text,
  patient_note text,
  status text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    t.id,
    t.clinic_id,
    c.name as clinic_name,
    c.slug as clinic_slug,
    t.treatment_date,
    t.provider,
    t.tooth,
    t.procedure,
    t.follow_up,
    t.patient_note,
    t.status
  from treatments t
  join patients p on p.id = t.patient_id
  join clinics c on c.id = t.clinic_id
  where p.user_id = auth.uid()
  order by t.treatment_date desc, t.created_at desc;
$$;

create or replace function public_treatments_by_phone(p_clinic_id uuid, p_phone text)
returns table (
  id uuid,
  treatment_date date,
  provider text,
  tooth text,
  procedure text,
  follow_up text,
  patient_note text,
  status text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    t.id,
    t.treatment_date,
    t.provider,
    t.tooth,
    t.procedure,
    t.follow_up,
    t.patient_note,
    t.status
  from treatments t
  join patients p on p.id = t.patient_id
  where t.clinic_id = p_clinic_id
    and regexp_replace(coalesce(p.phone, ''), '\D', '', 'g')
        = regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')
  order by t.treatment_date desc, t.created_at desc;
$$;

create or replace function my_consents()
returns table (
  id uuid,
  clinic_id uuid,
  clinic_name text,
  clinic_slug text,
  procedure text,
  body text,
  signed_name text,
  signed_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select
    cr.id,
    cr.clinic_id,
    c.name as clinic_name,
    c.slug as clinic_slug,
    cr.procedure,
    cr.body,
    cr.signed_name,
    cr.signed_at
  from consent_records cr
  join patients p on p.id = cr.patient_id
  join clinics c on c.id = cr.clinic_id
  where p.user_id = auth.uid()
  order by cr.signed_at desc;
$$;

create or replace function public_consents_by_phone(p_clinic_id uuid, p_phone text)
returns table (
  id uuid,
  procedure text,
  body text,
  signed_name text,
  signed_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select
    cr.id,
    cr.procedure,
    cr.body,
    cr.signed_name,
    cr.signed_at
  from consent_records cr
  join patients p on p.id = cr.patient_id
  where cr.clinic_id = p_clinic_id
    and regexp_replace(coalesce(p.phone, ''), '\D', '', 'g')
        = regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')
  order by cr.signed_at desc;
$$;

grant execute on function my_treatments() to authenticated;
grant execute on function public_treatments_by_phone(uuid, text) to anon, authenticated;
grant execute on function my_consents() to authenticated;
grant execute on function public_consents_by_phone(uuid, text) to anon, authenticated;
