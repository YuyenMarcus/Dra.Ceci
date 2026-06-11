-- ============================================================================
-- 0014_affiliates.sql — Referral / affiliate codes + commission tracking.
--
-- A partner shares a code (e.g. via clinika.health/signup?ref=MARIA). When a new
-- clinic signs up with a valid, active code we stamp profile.referralCode and
-- set profile.referralSource = 'partner'. The admin console groups clinics by
-- referralCode to show how many each affiliate referred and the commission owed
-- (a per-affiliate share of the monthly price on actively-paying referrals).
--
-- Run in the Supabase SQL Editor after 0013.
-- ============================================================================

create table if not exists affiliates (
  code           text primary key,           -- normalized: UPPERCASE, no spaces
  name           text not null default '',    -- partner label (for the console)
  commission_pct numeric not null default 0.20,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

-- Only SECURITY DEFINER admin RPCs (and the public validator below) touch this
-- table — enable RLS with no policies so it's otherwise inaccessible.
alter table affiliates enable row level security;

-- ---------------------------------------------------------------------------
-- Public: validate a referral code (so the signup form can confirm it). Only
-- reveals whether an active code exists; no other data.
-- ---------------------------------------------------------------------------
create or replace function affiliate_code_valid(p_code text)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from affiliates
    where active = true
      and code = upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'))
  );
$$;
revoke all on function affiliate_code_valid(text) from public;
grant execute on function affiliate_code_valid(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Stamp the referral code on new clinics. Recreates handle_new_user (0007),
-- adding affiliate-code capture: a valid+active code sets referralSource to
-- 'partner' and records profile.referralCode.
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
  v_ref_code text := upper(regexp_replace(coalesce(new.raw_user_meta_data->>'referralCode', ''), '\s', '', 'g'));
  v_ref_valid boolean := false;
  v_referral_source text := coalesce(nullif(btrim(new.raw_user_meta_data->>'referralSource'), ''), 'organic');
  v_profile jsonb;
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

  if v_ref_code <> '' then
    select exists (select 1 from affiliates where active = true and code = v_ref_code)
      into v_ref_valid;
  end if;
  if v_ref_valid then
    v_referral_source := 'partner';
  end if;

  v_profile := jsonb_build_object(
    'trialEndsAt', to_char((now() + interval '14 days'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'plan', 'starter',
    'referralSource', v_referral_source
  );
  if v_ref_valid then
    v_profile := v_profile || jsonb_build_object('referralCode', v_ref_code);
  end if;

  insert into clinics (owner_id, slug, name, email, profile)
  values (new.id, v_slug, v_name, coalesce(new.email, ''), v_profile);

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: list / upsert / delete affiliate codes.
-- ---------------------------------------------------------------------------
create or replace function admin_affiliates()
returns table (
  code           text,
  name           text,
  commission_pct numeric,
  active         boolean,
  created_at     timestamptz
)
language plpgsql security definer stable set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;
  return query
    select a.code, a.name, a.commission_pct, a.active, a.created_at
    from affiliates a
    order by a.created_at desc;
end;
$$;
revoke all on function admin_affiliates() from public;
grant execute on function admin_affiliates() to authenticated;

create or replace function admin_save_affiliate(
  p_code text,
  p_name text,
  p_pct numeric,
  p_active boolean
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;
  if v_code = '' then
    raise exception 'code required';
  end if;
  insert into affiliates (code, name, commission_pct, active)
  values (
    v_code,
    coalesce(p_name, ''),
    greatest(0, least(1, coalesce(p_pct, 0.20))),
    coalesce(p_active, true)
  )
  on conflict (code) do update
    set name           = excluded.name,
        commission_pct = excluded.commission_pct,
        active         = excluded.active;
end;
$$;
revoke all on function admin_save_affiliate(text, text, numeric, boolean) from public;
grant execute on function admin_save_affiliate(text, text, numeric, boolean) to authenticated;

create or replace function admin_delete_affiliate(p_code text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;
  delete from affiliates
  where code = upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
end;
$$;
revoke all on function admin_delete_affiliate(text) from public;
grant execute on function admin_delete_affiliate(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Add referral_code to admin_overview so the console can group by affiliate.
-- (Return type changes, so drop + recreate; based on the 0008 definition.)
-- ---------------------------------------------------------------------------
drop function if exists admin_overview();
create function admin_overview()
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
  referral_code   text,
  plan_cycle      text,
  last_sign_in_at timestamptz,
  patient_count   bigint,
  appt_count      bigint,
  appt_this_month bigint,
  inventory_count bigint,
  last_event_at   timestamptz,
  last_event_type text
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
    coalesce(nullif(c.profile->>'referralCode', ''), ''),
    coalesce(nullif(c.profile->>'planCycle', ''), 'monthly'),
    u.last_sign_in_at,
    (select count(*) from patients p where p.clinic_id = c.id),
    (select count(*) from appointments a where a.clinic_id = c.id),
    (select count(*) from appointments a where a.clinic_id = c.id and a.created_at >= date_trunc('month', now())),
    (select count(*) from inventory i where i.clinic_id = c.id),
    (select max(e.created_at) from app_events e where e.clinic_id = c.id),
    (select e.type from app_events e where e.clinic_id = c.id order by e.created_at desc limit 1)
  from clinics c
  join auth.users u on u.id = c.owner_id
  order by c.created_at desc;
end;
$$;
revoke all on function admin_overview() from public;
grant execute on function admin_overview() to authenticated;
