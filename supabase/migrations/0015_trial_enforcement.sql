-- ============================================================================
-- 0015_trial_enforcement.sql — Server-side (RLS) trial/subscription enforcement.
--
-- The web app already paywalls the doctor UI once the 14-day trial + 24h grace
-- window lapse with no active subscription (see src/lib/access.js). This adds a
-- matching DATABASE boundary so a clinic that hasn't paid can't reach its own
-- clinical data by calling the API directly — the owner policies on the
-- clinic-scoped tables now also require clinic_access_ok(clinic_id).
--
-- What stays reachable (intentionally):
--   * clinics SELECT — needed so the paywall/AuthContext can read billing state.
--   * patients_self_read / appointments_self_read — a patient keeps access to
--     THEIR OWN records regardless of the clinic's billing.
--   * public booking / availability RPCs (SECURITY DEFINER) — patients can still
--     book; Stripe webhook + checkout run with the service role and bypass RLS,
--     so subscribing always works and immediately lifts the lock.
--
-- Lock rule (mirrors the client, but FAILS OPEN on anything indeterminate so a
-- paying or legacy clinic is never wrongly locked out of its data):
--   active  := billing in ('manual','stripe')
--              OR stripe.status in ('active','trialing')
--              OR trialEndsAt is missing            (legacy, pre-trial accounts)
--              OR now() < trialEndsAt + 24 hours    (trial + grace window)
--
-- Run in the Supabase SQL Editor after 0014.
-- ============================================================================

create or replace function clinic_access_ok(p_clinic_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  -- coalesce(..., true): if the clinic can't be resolved, fail open (allow) so
  -- we never hard-lock on missing/odd data — the client paywall is the strict
  -- UX gate; this is defense-in-depth.
  select coalesce((
    select
      case
        when coalesce(c.profile->>'billing', '') in ('manual', 'stripe') then true
        when coalesce(c.profile->'stripe'->>'status', '') in ('active', 'trialing') then true
        when nullif(c.profile->>'trialEndsAt', '') is null then true
        when now() < (c.profile->>'trialEndsAt')::timestamptz + interval '24 hours' then true
        else false
      end
    from clinics c
    where c.id = p_clinic_id
  ), true);
$$;
revoke all on function clinic_access_ok(uuid) from public;
grant execute on function clinic_access_ok(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Re-create the clinic-owner policies to also require an active clinic.
-- (Self-read policies for linked patients are intentionally left unchanged.)
-- ---------------------------------------------------------------------------

-- patients (0001)
drop policy if exists patients_owner_all on patients;
create policy patients_owner_all on patients
  for all
  using (is_clinic_owner(clinic_id) and clinic_access_ok(clinic_id))
  with check (is_clinic_owner(clinic_id) and clinic_access_ok(clinic_id));

-- inventory (0001)
drop policy if exists inventory_owner_all on inventory;
create policy inventory_owner_all on inventory
  for all
  using (is_clinic_owner(clinic_id) and clinic_access_ok(clinic_id))
  with check (is_clinic_owner(clinic_id) and clinic_access_ok(clinic_id));

-- appointments (0001)
drop policy if exists appointments_owner_all on appointments;
create policy appointments_owner_all on appointments
  for all
  using (is_clinic_owner(clinic_id) and clinic_access_ok(clinic_id))
  with check (is_clinic_owner(clinic_id) and clinic_access_ok(clinic_id));

-- treatments (0004)
drop policy if exists treatments_owner_all on treatments;
create policy treatments_owner_all on treatments
  for all
  using (is_clinic_owner(clinic_id) and clinic_access_ok(clinic_id))
  with check (is_clinic_owner(clinic_id) and clinic_access_ok(clinic_id));

-- consent_records (0004)
drop policy if exists consents_owner_all on consent_records;
create policy consents_owner_all on consent_records
  for all
  using (is_clinic_owner(clinic_id) and clinic_access_ok(clinic_id))
  with check (is_clinic_owner(clinic_id) and clinic_access_ok(clinic_id));
