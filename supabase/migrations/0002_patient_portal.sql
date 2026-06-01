-- ============================================================================
-- MedTrack — Phase 4: patient portal ("all my doctors")
--
-- Patients can optionally create a Supabase Auth account (role = 'patient').
-- They book by phone, so their records already exist as phone-based `patients`
-- rows across one or more clinics. This migration lets a logged-in patient
-- CLAIM those rows by phone, which (via existing self-read RLS) unlocks read
-- access to their records and appointments at every clinic they belong to.
--
-- Security note: phone is the same shared secret the public manage/cancel flow
-- already relies on. Claiming only affects rows that are not yet linked to
-- another account (user_id is null), so one patient can't steal another's
-- already-claimed record.
-- ============================================================================

create or replace function link_my_patient_records(p_phone text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_digits text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_count  integer;
begin
  if v_uid is null or length(v_digits) < 7 then
    return 0;
  end if;

  update patients
  set user_id = v_uid
  where user_id is null
    and regexp_replace(coalesce(phone, ''), '\D', '', 'g') = v_digits;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Only logged-in users can claim records; anon visitors cannot.
revoke execute on function link_my_patient_records(text) from anon;
grant  execute on function link_my_patient_records(text) to authenticated;
