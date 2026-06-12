-- ============================================================================
-- 0020_availability.sql — Rich availability config + capacity-aware booking.
--
-- 1. Per-branch availability: clinic_locations gains an `availability` jsonb so
--    each branch can carry the same rich schedule config the clinic uses
--    (custom weekly hours, block-offs, active date ranges, published times,
--    buffer/notice/horizon/capacity). Empty {} = fall back to the branch's
--    simple working_days/start_hour/end_hour columns (unchanged behavior).
--
-- 2. The public branch RPC now returns `availability` so the booking page can
--    build each branch's calendar from it.
--
-- 3. request_appointment now respects a per-slot CAPACITY (multiple chairs):
--    it allows up to N concurrent bookings instead of always blocking the 2nd.
--    Capacity is read from the branch's availability when booking a branch,
--    otherwise from the clinic profile's availability. Default 1 keeps the
--    previous "never double-book" behavior, so this is backward compatible.
--
-- 4. The main clinic is bookable alongside its branches as its own calendar:
--    location_id NULL = main clinic. public_taken_slots and the conflict
--    guardrail now match the location with IS NOT DISTINCT FROM.
--
-- Run in the Supabase SQL Editor after 0019.
-- ============================================================================

alter table clinic_locations
  add column if not exists availability jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- Public branch list now includes the availability config.
-- ---------------------------------------------------------------------------
drop function if exists public_clinic_locations(uuid);
create or replace function public_clinic_locations(p_clinic_id uuid)
returns table (
  id uuid, name text, address text, city text, phone text, map_query text,
  lat double precision, lng double precision, hours text,
  working_days integer[], start_hour integer, end_hour integer, slot_minutes integer,
  availability jsonb
)
language sql security definer stable set search_path = public
as $$
  select id, name, address, city, phone, map_query, lat, lng, hours,
         working_days, start_hour, end_hour, slot_minutes, availability
  from clinic_locations
  where clinic_id = p_clinic_id and active = true
  order by sort_order asc, created_at asc;
$$;
grant execute on function public_clinic_locations(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- The main clinic is bookable alongside its branches, as its own calendar:
-- appointments with location_id NULL belong to the main clinic. Busy slots are
-- now matched with IS NOT DISTINCT FROM so p_location_id = null returns only
-- main-clinic appointments instead of every branch's. (For clinics without
-- branches every appointment has location_id null, so behavior is unchanged.)
-- ---------------------------------------------------------------------------
drop function if exists public_taken_slots(uuid, timestamptz, timestamptz, uuid);
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
    and a.location_id is not distinct from p_location_id;
$$;
grant execute on function public_taken_slots(uuid, timestamptz, timestamptz, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Capacity-aware booking. Guardrail 3 now allows up to `capacity` concurrent
-- appointments for the targeted calendar (branch, or main clinic when no
-- branch is given).
-- ---------------------------------------------------------------------------
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
  v_capacity integer := 1;
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

  -- Resolve the capacity (number of concurrent appointments allowed per slot)
  -- from the targeted calendar's availability config; default 1.
  if p_location_id is not null then
    select coalesce(nullif(availability->>'capacity', '')::int, 1) into v_capacity
    from clinic_locations where id = p_location_id;
  else
    select coalesce(nullif(profile->'availability'->>'capacity', '')::int, 1) into v_capacity
    from clinics where id = p_clinic_id;
  end if;
  if v_capacity is null or v_capacity < 1 then
    v_capacity := 1;
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

  -- Guardrail 3: protect the calendar from over-booking, scoped to the chosen
  -- calendar (a branch, or the main clinic = null location). Allow up to
  -- `capacity` concurrent appointments.
  select count(*) into v_conflict
  from appointments a
  where a.clinic_id = p_clinic_id
    and a.status = 'scheduled'
    and a.location_id is not distinct from p_location_id
    and a.start < v_end
    and (a.start + make_interval(mins => a.duration_min)) > p_start;
  if v_conflict >= v_capacity then
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
