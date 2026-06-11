-- ============================================================================
-- 0008_events.sql — Product-usage + billing event log (growth & churn metrics)
--
-- Two append-only logs:
--   app_events     — lightweight product usage (feature opened, portal login).
--                    Powers "last feature used", engagement recency, portal
--                    logins. Written by the browser (clinic owner / patient).
--   billing_events — subscription lifecycle, written by the Stripe webhook via
--                    the service role. Powers trial→paid conversion, new vs
--                    churned MRR this month vs last.
--
-- Run in the Supabase SQL Editor after 0007.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Product usage events
-- ---------------------------------------------------------------------------
create table if not exists app_events (
  id         bigint generated always as identity primary key,
  clinic_id  uuid references clinics(id) on delete cascade,   -- null for patient-portal events
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type       text not null,                                   -- e.g. 'feature.open', 'portal.login'
  meta       jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_app_events_clinic on app_events(clinic_id, created_at desc);
create index if not exists idx_app_events_type   on app_events(type, created_at desc);

alter table app_events enable row level security;

-- Insert: a user may log a personal event (clinic_id null, e.g. portal login)
-- or an event for a clinic they own. user_id is forced to the caller.
drop policy if exists app_events_insert on app_events;
create policy app_events_insert on app_events
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (clinic_id is null or is_clinic_owner(clinic_id))
  );

-- Read: owner sees their clinic's events; admins see everything (via RPCs too).
drop policy if exists app_events_owner_read on app_events;
create policy app_events_owner_read on app_events
  for select using (clinic_id is not null and is_clinic_owner(clinic_id));

drop policy if exists app_events_admin_read on app_events;
create policy app_events_admin_read on app_events
  for select using (is_admin());

-- ---------------------------------------------------------------------------
-- 2) Billing events (written by the Stripe webhook / service role)
-- ---------------------------------------------------------------------------
create table if not exists billing_events (
  id         bigint generated always as identity primary key,
  clinic_id  uuid references clinics(id) on delete set null,
  type       text not null,            -- 'subscribed' | 'canceled'
  plan       text,
  amount     numeric not null default 0, -- monthly USD value at the time
  created_at timestamptz not null default now()
);

create index if not exists idx_billing_events_created on billing_events(created_at desc);
create index if not exists idx_billing_events_type    on billing_events(type, created_at desc);

alter table billing_events enable row level security;

-- No client writes (service role bypasses RLS). Admins may read.
drop policy if exists billing_events_admin_read on billing_events;
create policy billing_events_admin_read on billing_events
  for select using (is_admin());

-- ---------------------------------------------------------------------------
-- 3) Extend admin_overview with last-activity (must DROP: return shape changes).
-- ---------------------------------------------------------------------------
drop function if exists admin_overview();

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

-- ---------------------------------------------------------------------------
-- 4) Time-based growth metrics (single JSON object).
-- ---------------------------------------------------------------------------
create or replace function admin_growth()
returns jsonb
language plpgsql security definer stable set search_path = public
as $$
declare
  v_this  timestamptz := date_trunc('month', now());
  v_last  timestamptz := date_trunc('month', now()) - interval '1 month';
  result  jsonb;
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;

  select jsonb_build_object(
    'signupsThis', (select count(*) from clinics where created_at >= v_this),
    'signupsLast', (select count(*) from clinics where created_at >= v_last and created_at < v_this),
    'subscribedThis', (select count(*) from billing_events where type = 'subscribed' and created_at >= v_this),
    'subscribedLast', (select count(*) from billing_events where type = 'subscribed' and created_at >= v_last and created_at < v_this),
    'churnedThis', (select count(*) from billing_events where type = 'canceled' and created_at >= v_this),
    'churnedLast', (select count(*) from billing_events where type = 'canceled' and created_at >= v_last and created_at < v_this),
    'newMrrThis', (select coalesce(sum(amount), 0) from billing_events where type = 'subscribed' and created_at >= v_this),
    'lostMrrThis', (select coalesce(sum(amount), 0) from billing_events where type = 'canceled' and created_at >= v_this),
    'portalLoginsThis', (select count(*) from app_events where type = 'portal.login' and created_at >= v_this),
    'activeClinics7d', (select count(distinct clinic_id) from app_events where clinic_id is not null and created_at >= now() - interval '7 days')
  )
  into result;

  return result;
end;
$$;

revoke all on function admin_growth() from public;
grant execute on function admin_growth() to authenticated;
