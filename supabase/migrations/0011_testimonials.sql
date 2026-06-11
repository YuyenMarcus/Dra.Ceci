-- ============================================================================
-- 0011_testimonials.sql — In-app feedback: a rating + comment about Clinika.
--
-- Collected from logged-in users (clinic owners). One row per user; submitting
-- again edits the existing testimonial. NOTHING is shown publicly here — the
-- operator reviews them in /admin and later hand-picks real ones for marketing.
--
-- Run in the Supabase SQL Editor after 0010.
-- ============================================================================

create table if not exists app_testimonials (
  id           bigint generated always as identity primary key,
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  clinic_id    uuid references clinics(id) on delete set null,
  rating       smallint not null check (rating between 1 and 5),
  comment      text not null default '',
  display_name text not null default '',
  status       text not null default 'new' check (status in ('new', 'approved', 'hidden')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id)
);

create index if not exists idx_testimonials_status on app_testimonials(status, created_at desc);

alter table app_testimonials enable row level security;

-- A user may read (and prefill) their own testimonial; admins read everything.
drop policy if exists testimonials_own_read on app_testimonials;
create policy testimonials_own_read on app_testimonials
  for select using (user_id = auth.uid());

drop policy if exists testimonials_admin_read on app_testimonials;
create policy testimonials_admin_read on app_testimonials
  for select using (is_admin());

-- ---------------------------------------------------------------------------
-- Submit / update my testimonial. Auto-fills display name from my clinic.
-- ---------------------------------------------------------------------------
create or replace function submit_testimonial(p_rating int, p_comment text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_clinic_id uuid;
  v_name   text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'err.noBackend');
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    return jsonb_build_object('ok', false, 'error', 'err.ratingRequired');
  end if;

  select c.id, c.name into v_clinic_id, v_name
  from clinics c where c.owner_id = v_uid
  order by c.created_at limit 1;

  insert into app_testimonials (user_id, clinic_id, rating, comment, display_name)
  values (v_uid, v_clinic_id, p_rating, left(coalesce(p_comment, ''), 1000), coalesce(v_name, ''))
  on conflict (user_id) do update
    set rating       = excluded.rating,
        comment      = excluded.comment,
        display_name = excluded.display_name,
        clinic_id    = excluded.clinic_id,
        status       = 'new',
        updated_at   = now();

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function submit_testimonial(int, text) from public;
grant execute on function submit_testimonial(int, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: list testimonials (newest first).
-- ---------------------------------------------------------------------------
create or replace function admin_testimonials()
returns table (
  id           bigint,
  clinic_id    uuid,
  clinic_slug  text,
  display_name text,
  rating       smallint,
  comment      text,
  status       text,
  created_at   timestamptz
)
language plpgsql security definer stable set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;
  return query
  select tm.id, tm.clinic_id, c.slug, tm.display_name, tm.rating, tm.comment, tm.status, tm.created_at
  from app_testimonials tm
  left join clinics c on c.id = tm.clinic_id
  order by (tm.status = 'new') desc, tm.created_at desc;
end;
$$;

revoke all on function admin_testimonials() from public;
grant execute on function admin_testimonials() to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: approve / hide a testimonial (curate which become marketing copy).
-- ---------------------------------------------------------------------------
create or replace function admin_set_testimonial_status(p_id bigint, p_status text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;
  if p_status not in ('new', 'approved', 'hidden') then
    return jsonb_build_object('ok', false, 'error', 'invalid status');
  end if;
  update app_testimonials set status = p_status, updated_at = now() where id = p_id;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function admin_set_testimonial_status(bigint, text) from public;
grant execute on function admin_set_testimonial_status(bigint, text) to authenticated;
