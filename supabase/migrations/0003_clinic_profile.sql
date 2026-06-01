-- ============================================================================
-- MedTrack — Editable public profile (marketing content + images)
--
-- Adds a single JSONB `profile` blob to clinics that holds everything a doctor
-- can edit on their public page (headline, bio, highlights, hours, services and
-- image URLs), plus a public Storage bucket for uploaded photos.
--
-- Run this in the Supabase SQL Editor after 0001 and 0002.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Editable profile content
-- ---------------------------------------------------------------------------
alter table clinics
  add column if not exists profile jsonb not null default '{}';

-- Expose `profile` on the public, PII-safe slug lookup so the marketing page
-- can render it for anonymous visitors.
-- Must DROP first: Postgres cannot change RETURNS TABLE shape via CREATE OR REPLACE.
drop function if exists public_clinic_by_slug(text);

create or replace function public_clinic_by_slug(p_slug text)
returns table (
  id uuid, slug text, name text, specialty text, clinic_name text,
  phone text, address text, city text, map_query text,
  working_days integer[], start_hour integer, end_hour integer, slot_minutes integer,
  profile jsonb
)
language sql
security definer
stable
set search_path = public
as $$
  select id, slug, name, specialty, clinic_name, phone, address, city, map_query,
         working_days, start_hour, end_hour, slot_minutes, profile
  from clinics
  where slug = p_slug;
$$;

grant execute on function public_clinic_by_slug(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Public image bucket for profile photos
--    Files are stored under "<owner_id>/<file>" so each owner can only write
--    inside their own folder. Reads are public so the marketing page works for
--    anonymous visitors.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('clinic-public', 'clinic-public', true)
on conflict (id) do update set public = true;

drop policy if exists "clinic public read" on storage.objects;
create policy "clinic public read" on storage.objects
  for select
  using (bucket_id = 'clinic-public');

drop policy if exists "clinic public insert" on storage.objects;
create policy "clinic public insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'clinic-public'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "clinic public update" on storage.objects;
create policy "clinic public update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'clinic-public'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'clinic-public'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "clinic public delete" on storage.objects;
create policy "clinic public delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'clinic-public'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
