-- ============================================================================
-- 0012_directory_visibility.sql — Let a clinic opt out of the public directory.
--
-- profile.unlisted = true hides a clinic from "Find a doctor" WITHOUT pausing
-- bookings: the profile is still reachable by its direct link and bookable.
-- (Distinct from profile.suspended, which pauses the public presence entirely.)
--
-- The web app filters the directory client-side in listClinics(), so this only
-- needs to keep the optional server-side public_clinics() RPC consistent.
--
-- Run in the Supabase SQL Editor after 0011.
-- ============================================================================

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
    and coalesce((c.profile ->> 'unlisted')::boolean, false) = false
  order by c.name;
$$;

revoke all on function public.public_clinics() from public;
grant execute on function public.public_clinics() to anon, authenticated;
