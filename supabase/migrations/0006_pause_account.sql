-- 0006_pause_account.sql
-- "Pause account" support.
--
-- Pausing is just a flag inside clinics.profile (JSONB): profile.suspended = true.
-- The clinic owner toggles it through the normal owner UPDATE policy from
-- migration 0001, so no new write path is needed. This migration only:
--   1. Guarantees the profile column exists (no-op if 0003 already ran).
--   2. Adds an OPTIONAL server-side directory RPC that omits paused clinics,
--      so a paused clinic's marketing data is never sent to anonymous visitors
--      (the public booking page still resolves a paused clinic by slug so it can
--      show the "bookings paused" message).

-- 1) Ensure the JSONB profile column exists.
alter table public.clinics
  add column if not exists profile jsonb not null default '{}'::jsonb;

-- 2) Optional: directory listing that filters out paused clinics in the database.
--    Returns only non-sensitive marketing fields (no email/phone).
create or replace function public.public_clinics()
returns table (
  id          uuid,
  slug        text,
  name        text,
  specialty   text,
  clinic_name text,
  city        text,
  profile     jsonb
)
language sql
security definer
stable
set search_path = public
as $$
  select c.id, c.slug, c.name, c.specialty, c.clinic_name, c.city, c.profile
  from clinics c
  where coalesce((c.profile ->> 'suspended')::boolean, false) = false
  order by c.name;
$$;

revoke all on function public.public_clinics() from public;
grant execute on function public.public_clinics() to anon, authenticated;
