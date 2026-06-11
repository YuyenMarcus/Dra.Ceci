-- ============================================================================
-- 0007_admin.sql — Admin console (super-admin / operator view)
--
-- Adds a small admin allowlist and a set of SECURITY DEFINER RPCs that let an
-- admin read every clinic (across tenants) and adjust their tier / trial /
-- status WITHOUT giving the browser broad table access. Everything is gated by
-- is_admin() so a normal clinic owner can never call these.
--
-- Run in the Supabase SQL Editor after 0006. THEN seed yourself as admin (see
-- the very bottom of this file).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Admin allowlist
-- ---------------------------------------------------------------------------
create table if not exists app_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text,
  created_at timestamptz not null default now()
);

alter table app_admins enable row level security;

-- An admin may see their own row (used by the client to know it's an admin).
-- There is NO client write policy: admins are added via SQL only.
drop policy if exists app_admins_self_read on app_admins;
create policy app_admins_self_read on app_admins
  for select using (user_id = auth.uid());

create or replace function is_admin()
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (select 1 from app_admins a where a.user_id = auth.uid());
$$;

-- Public-facing "am I an admin?" check for the client UI gate.
create or replace function am_i_admin()
returns boolean
language sql security definer stable set search_path = public
as $$
  select is_admin();
$$;

revoke all on function am_i_admin() from public;
grant execute on function am_i_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Give new clinics a 14-day trial on signup (profile.trialEndsAt).
--    Recreates handle_new_user from 0001, adding the trial stamp.
-- ---------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_role text := coalesce(new.raw_user_meta_data->>'role', 'patient');
  v_name text := coalesce(nullif(btrim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1));
  v_base text := coalesce(nullif(btrim(new.raw_user_meta_data->>'slug'), ''), lower(regexp_replace(v_name, '[^a-zA-Z0-9]+', '-', 'g')));
  v_slug text;
  v_try integer := 0;
begin
  if v_role <> 'doctor' then
    return new;
  end if;

  v_base := btrim(v_base, '-');
  if v_base = '' then v_base := 'clinic'; end if;
  v_slug := v_base;
  while exists (select 1 from clinics where slug = v_slug) loop
    v_try := v_try + 1;
    v_slug := v_base || '-' || v_try;
  end loop;

  insert into clinics (owner_id, slug, name, email, profile)
  values (
    new.id, v_slug, v_name, coalesce(new.email, ''),
    jsonb_build_object(
      'trialEndsAt', to_char((now() + interval '14 days'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'plan', 'starter',
      'referralSource', coalesce(nullif(btrim(new.raw_user_meta_data->>'referralSource'), ''), 'organic')
    )
  );

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) Admin read: one row per clinic with the metrics the console needs.
-- ---------------------------------------------------------------------------
create or replace function admin_overview()
returns table (
  id              uuid,
  slug            text,
  name            text,
  owner_email     text,
  city            text,
  created_at      timestamptz,
  plan            text,
  billing         text,
  suspended       boolean,
  trial_ends_at   timestamptz,
  referral_source text,
  plan_cycle      text,
  last_sign_in_at timestamptz,
  patient_count   bigint,
  appt_count      bigint,
  appt_this_month bigint,
  inventory_count bigint
)
language plpgsql security definer stable set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;

  return query
  select
    c.id,
    c.slug,
    c.name,
    c.email,
    c.city,
    c.created_at,
    coalesce(nullif(c.profile->>'plan', ''), 'starter'),
    coalesce(c.profile->>'billing', ''),
    coalesce((c.profile->>'suspended')::boolean, false),
    nullif(c.profile->>'trialEndsAt', '')::timestamptz,
    coalesce(nullif(c.profile->>'referralSource', ''), 'organic'),
    coalesce(nullif(c.profile->>'planCycle', ''), 'monthly'),
    u.last_sign_in_at,
    (select count(*) from patients p where p.clinic_id = c.id),
    (select count(*) from appointments a where a.clinic_id = c.id),
    (select count(*) from appointments a where a.clinic_id = c.id and a.created_at >= date_trunc('month', now())),
    (select count(*) from inventory i where i.clinic_id = c.id)
  from clinics c
  join auth.users u on u.id = c.owner_id
  order by c.created_at desc;
end;
$$;

revoke all on function admin_overview() from public;
grant execute on function admin_overview() to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Admin write: shallow-merge a JSON patch into a clinic's profile.
--    Used to set plan/billing, extend trial, suspend/activate, set referral.
-- ---------------------------------------------------------------------------
create or replace function admin_update_clinic(p_clinic_id uuid, p_patch jsonb)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;

  update clinics
  set profile = coalesce(profile, '{}'::jsonb) || coalesce(p_patch, '{}'::jsonb)
  where id = p_clinic_id;
end;
$$;

revoke all on function admin_update_clinic(uuid, jsonb) from public;
grant execute on function admin_update_clinic(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 5) SEED YOURSELF AS ADMIN  (run once, replace the email)
-- ---------------------------------------------------------------------------
-- insert into app_admins (user_id, email)
-- select id, email from auth.users where email = 'you@example.com'
-- on conflict (user_id) do nothing;
