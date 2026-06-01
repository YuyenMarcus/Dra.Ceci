-- ============================================================================
-- MedTrack — Supabase schema (DO NOT RUN THIS FILE)
-- ============================================================================
--
-- This file is documentation only. Running it against a project that already
-- uses the migration files will fail (e.g. "column doctor_id does not exist")
-- because the live schema uses clinics / patients / clinic_id, not the old
-- demo tables doctors / clients / doctor_id.
--
-- Apply schema in the Supabase SQL Editor, in this order:
--
--   1. supabase/migrations/0001_clinics_auth_tenancy.sql
--   2. supabase/migrations/0002_patient_portal.sql
--   3. supabase/migrations/0003_clinic_profile.sql
--      (includes DROP FUNCTION before recreating public_clinic_by_slug)
--   4. supabase/migrations/0004_treatments.sql
--
-- If 0003 failed partway, run only the block you need from that file, or:
--   - ALTER TABLE clinics ADD COLUMN IF NOT EXISTS profile jsonb ...
--   - DROP FUNCTION IF EXISTS public_clinic_by_slug(text);
--   - then CREATE FUNCTION public_clinic_by_slug ... with profile column
--
-- Current model (summary):
--   clinics      — one tenant per doctor (owner_id → auth.users)
--   patients     — fichas (clinic_id, optional user_id for patient portal)
--   inventory    — clinic_id
--   appointments — clinic_id, patient_id
--   treatments   — clinical log (0004)
--   consent_records — informed consent (0004)
--
-- Auth: Supabase Auth only (no password column on any table).
-- ============================================================================

-- Optional: verify expected tables exist (safe to run anytime)
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'clinics', 'patients', 'inventory', 'appointments',
    'treatments', 'consent_records'
  )
order by table_name;
