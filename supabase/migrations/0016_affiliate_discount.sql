-- ============================================================================
-- 0016_affiliate_discount.sql — Give referred clinics a first-month discount.
--
-- An affiliate code can now grant the referred clinic a percentage off their
-- FIRST month (applied as a Stripe coupon with duration='once' at checkout).
--   * affiliates.discount_pct  — fraction 0..1 (e.g. 0.20 = 20% off month 1)
--   * affiliates.stripe_coupon_id — cached Stripe coupon reused across checkouts
--     (reset to NULL whenever discount_pct changes so a fresh coupon is made).
--
-- discount_pct is stored as a fraction to match commission_pct; the checkout
-- function converts to Stripe's percent_off (×100).
--
-- Run in the Supabase SQL Editor after 0015.
-- ============================================================================

alter table affiliates add column if not exists discount_pct numeric not null default 0;
alter table affiliates add column if not exists stripe_coupon_id text;

-- ---------------------------------------------------------------------------
-- Public: code info for the signup form (validity + first-month discount).
-- Returns no rows when the code is invalid/inactive.
-- ---------------------------------------------------------------------------
create or replace function public_affiliate_info(p_code text)
returns table (valid boolean, discount_pct numeric)
language sql security definer stable set search_path = public
as $$
  select true, a.discount_pct
  from affiliates a
  where a.active = true
    and a.code = upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'))
  limit 1;
$$;
revoke all on function public_affiliate_info(text) from public;
grant execute on function public_affiliate_info(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin: list affiliates (now includes discount_pct).
-- ---------------------------------------------------------------------------
drop function if exists admin_affiliates();
create function admin_affiliates()
returns table (
  code           text,
  name           text,
  commission_pct numeric,
  discount_pct   numeric,
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
    select a.code, a.name, a.commission_pct, a.discount_pct, a.active, a.created_at
    from affiliates a
    order by a.created_at desc;
end;
$$;
revoke all on function admin_affiliates() from public;
grant execute on function admin_affiliates() to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: upsert affiliate (now takes a discount). Resets the cached Stripe
-- coupon when the discount changes so the next checkout mints a new one.
-- ---------------------------------------------------------------------------
drop function if exists admin_save_affiliate(text, text, numeric, boolean);
create function admin_save_affiliate(
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
    greatest(0, least(1, coalesce(p_discount, 0))),
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
revoke all on function admin_save_affiliate(text, text, numeric, numeric, boolean) from public;
grant execute on function admin_save_affiliate(text, text, numeric, numeric, boolean) to authenticated;
