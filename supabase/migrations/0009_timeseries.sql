-- ============================================================================
-- 0009_timeseries.sql — Daily time series for the admin growth charts.
--
-- admin_timeseries(p_days) returns one JSON object with a zero-filled daily
-- series over the requested window plus "base" values from before the window,
-- so the client can plot cumulative totals (registered clinics, running MRR)
-- as well as daily activity (signups, active clinics, portal logins).
--
-- Run in the Supabase SQL Editor after 0008.
-- ============================================================================

create or replace function admin_timeseries(p_days int default 90)
returns jsonb
language plpgsql security definer stable set search_path = public
as $$
declare
  v_days  int  := least(greatest(coalesce(p_days, 90), 7), 365);
  v_start date := (now() - (least(greatest(coalesce(p_days, 90), 7), 365) - 1) * interval '1 day')::date;
  result  jsonb;
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;

  select jsonb_build_object(
    'start', to_char(v_start, 'YYYY-MM-DD'),
    'days', v_days,
    -- Totals as of the day before the window, for cumulative charts.
    'baseClinics', (select count(*) from clinics where created_at < v_start),
    'baseMrr', (
      select coalesce(sum(case when type = 'subscribed' then amount else -amount end), 0)
      from billing_events where created_at < v_start
    ),
    'series', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'd', to_char(d.day, 'YYYY-MM-DD'),
        'signups', coalesce(s.n, 0),
        'active',  coalesce(a.n, 0),
        'logins',  coalesce(l.n, 0),
        'newMrr',  coalesce(b.new_mrr, 0),
        'lostMrr', coalesce(b.lost_mrr, 0)
      ) order by d.day), '[]'::jsonb)
      from generate_series(v_start, now()::date, interval '1 day') as d(day)
      left join (
        select created_at::date as day, count(*) as n
        from clinics where created_at >= v_start group by 1
      ) s on s.day = d.day::date
      left join (
        select created_at::date as day, count(distinct clinic_id) as n
        from app_events where clinic_id is not null and created_at >= v_start group by 1
      ) a on a.day = d.day::date
      left join (
        select created_at::date as day, count(*) as n
        from app_events where type = 'portal.login' and created_at >= v_start group by 1
      ) l on l.day = d.day::date
      left join (
        select created_at::date as day,
               sum(case when type = 'subscribed' then amount else 0 end) as new_mrr,
               sum(case when type = 'canceled'  then amount else 0 end) as lost_mrr
        from billing_events where created_at >= v_start group by 1
      ) b on b.day = d.day::date
    )
  )
  into result;

  return result;
end;
$$;

revoke all on function admin_timeseries(int) from public;
grant execute on function admin_timeseries(int) to authenticated;
