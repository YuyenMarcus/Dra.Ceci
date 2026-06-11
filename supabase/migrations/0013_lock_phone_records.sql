-- ============================================================================
-- 0013_lock_phone_records.sql — Stop serving clinical records to anonymous
-- phone lookups (PHI privacy fix).
--
-- Previously public_treatments_by_phone() and public_consents_by_phone() were
-- SECURITY DEFINER and granted to anon, so ANYONE who knew a clinic + a
-- patient's phone number could read that patient's full treatment history and
-- signed consent documents on /c/:slug/manage — with no proof of phone
-- ownership (an IDOR exposing protected health information).
--
-- Fix: clinical history and consents are now ONLY available to an authenticated
-- patient via my_treatments() / my_consents() (gated by auth.uid()), after the
-- patient links their phone-based records to their account
-- (link_my_patient_records). The anonymous "Manage booking" page keeps
-- appointment view/cancel by phone, but no longer exposes records.
--
-- We drop the phone-based record RPCs entirely to remove the attack surface
-- (dropping a function also drops all its grants). Appointment lookup/cancel by
-- phone (public_bookings_by_phone / public_cancel_appointment) is intentionally
-- left in place.
--
-- Run in the Supabase SQL Editor after 0012. Safe to re-run.
-- ============================================================================

drop function if exists public.public_treatments_by_phone(uuid, text);
drop function if exists public.public_consents_by_phone(uuid, text);
