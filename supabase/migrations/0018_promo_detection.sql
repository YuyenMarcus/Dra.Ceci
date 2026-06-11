-- ============================================================================
-- 0018_promo_detection.sql — Surface whether a clinic actually redeemed a
-- referral/promo discount at Stripe checkout.
--
-- The stripe-webhook now writes `profile.promo = { used, code, couponId,
-- amount, at }` on checkout.session.completed. Here we expose two of those
-- fields through admin_overview() so the console can flag accounts that used a
-- code (and which one).
--
-- Return type changes, so drop + recreate. Run after 0017.
-- ============================================================================

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
  last_event_type text,
  promo_used      boolean,
  promo_code      text
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
    (select e.type from app_events e where e.clinic_id = c.id order by e.created_at desc limit 1),
    coalesce((c.profile->'promo'->>'used')::boolean, false),
    nullif(c.profile->'promo'->>'code', '')
  from clinics c
  join auth.users u on u.id = c.owner_id
  order by c.created_at desc;
end;
$$;
revoke all on function admin_overview() from public;
grant execute on function admin_overview() to authenticated;
