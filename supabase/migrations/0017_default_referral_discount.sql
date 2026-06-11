-- ============================================================================
-- 0017_default_referral_discount.sql — Make 20% off the first month the default
-- referral perk.
--
--   * New affiliate codes default to 0.20 (20%) when no discount is given.
--   * Existing codes that still have 0% are backfilled to 20% (the feature is
--     new, so no intentional 0% values exist yet).
--
-- Run in the Supabase SQL Editor after 0016.
-- ============================================================================

-- Self-heal: make sure the discount columns from 0016 exist before we use them
-- (safe no-op if 0016 already added them).
alter table affiliates add column if not exists discount_pct numeric not null default 0;
alter table affiliates add column if not exists stripe_coupon_id text;

alter table affiliates alter column discount_pct set default 0.20;

update affiliates set discount_pct = 0.20 where coalesce(discount_pct, 0) = 0;

-- Default the admin upsert to 20% when the discount arg is null.
create or replace function admin_save_affiliate(
  p_code text,
  p_name text,
  p_pct numeric,
  p_discount numeric,
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
  insert into affiliates (code, name, commission_pct, discount_pct, active)
  values (
    v_code,
    coalesce(p_name, ''),
    greatest(0, least(1, coalesce(p_pct, 0.20))),
    greatest(0, least(1, coalesce(p_discount, 0.20))),
    coalesce(p_active, true)
  )
  on conflict (code) do update
    set name           = excluded.name,
        commission_pct = excluded.commission_pct,
        discount_pct   = excluded.discount_pct,
        active         = excluded.active,
        stripe_coupon_id = case
          when affiliates.discount_pct <> excluded.discount_pct then null
          else affiliates.stripe_coupon_id
        end;
end;
$$;
