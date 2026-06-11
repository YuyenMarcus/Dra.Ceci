-- ============================================================================
-- 0010_reports.sql — Public abuse reports for clinic profiles.
--
-- Lets anyone (anonymous patients included) flag a clinic's public profile.
-- Writes go ONLY through report_clinic() (security definer, light anti-spam).
-- Admins read the queue via admin_reports() and triage with admin_resolve_report().
--
-- Run in the Supabase SQL Editor after 0009.
-- ============================================================================

create table if not exists clinic_reports (
  id          bigint generated always as identity primary key,
  clinic_id   uuid not null references clinics(id) on delete cascade,
  reason      text not null,
  details     text not null default '',
  reporter    text not null default '',  -- optional email/phone the reporter leaves
  status      text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at  timestamptz not null default now()
);

create index if not exists idx_clinic_reports_status on clinic_reports(status, created_at desc);
create index if not exists idx_clinic_reports_clinic on clinic_reports(clinic_id, created_at desc);

alter table clinic_reports enable row level security;

-- No direct client table access. Submission via report_clinic(); reads via RPC.
drop policy if exists clinic_reports_admin_read on clinic_reports;
create policy clinic_reports_admin_read on clinic_reports
  for select using (is_admin());

-- ---------------------------------------------------------------------------
-- Public report submission (anonymous allowed).
-- ---------------------------------------------------------------------------
create or replace function report_clinic(
  p_clinic_id uuid,
  p_reason    text,
  p_details   text,
  p_contact   text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_recent integer;
begin
  if v_reason is null then
    return jsonb_build_object('ok', false, 'error', 'err.reportReason');
  end if;
  if not exists (select 1 from clinics where id = p_clinic_id) then
    return jsonb_build_object('ok', false, 'error', 'err.reportFailed');
  end if;

  -- Anti-spam: at most 5 reports for a given clinic per hour.
  select count(*) into v_recent
  from clinic_reports
  where clinic_id = p_clinic_id
    and created_at >= now() - interval '1 hour';
  if v_recent >= 5 then
    return jsonb_build_object('ok', false, 'error', 'err.reportTooMany');
  end if;

  insert into clinic_reports (clinic_id, reason, details, reporter)
  values (
    p_clinic_id,
    left(v_reason, 80),
    left(coalesce(p_details, ''), 1000),
    left(coalesce(p_contact, ''), 200)
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function report_clinic(uuid, text, text, text) from public;
grant execute on function report_clinic(uuid, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin: list reports (open first, newest first).
-- ---------------------------------------------------------------------------
create or replace function admin_reports()
returns table (
  id          bigint,
  clinic_id   uuid,
  clinic_name text,
  clinic_slug text,
  reason      text,
  details     text,
  reporter    text,
  status      text,
  created_at  timestamptz
)
language plpgsql security definer stable set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;
  return query
  select r.id, r.clinic_id, c.name, c.slug, r.reason, r.details, r.reporter, r.status, r.created_at
  from clinic_reports r
  join clinics c on c.id = r.clinic_id
  order by (r.status = 'open') desc, r.created_at desc;
end;
$$;

revoke all on function admin_reports() from public;
grant execute on function admin_reports() to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: update a report's status.
-- ---------------------------------------------------------------------------
create or replace function admin_resolve_report(p_id bigint, p_status text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;
  if p_status not in ('open', 'reviewed', 'dismissed') then
    return jsonb_build_object('ok', false, 'error', 'invalid status');
  end if;
  update clinic_reports set status = p_status where id = p_id;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function admin_resolve_report(bigint, text) from public;
grant execute on function admin_resolve_report(bigint, text) to authenticated;
