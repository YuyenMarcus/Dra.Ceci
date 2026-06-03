-- 0005_account_deletion.sql
-- Self-service account deletion.
--
-- Lets a signed-in user permanently delete their own account. Because every
-- tenant table cascades from the owning auth user:
--   auth.users (owner_id, ON DELETE CASCADE) -> clinics
--   clinics    (clinic_id, ON DELETE CASCADE) -> patients, inventory,
--                                                appointments, treatments,
--                                                consent_records
-- deleting the auth.users row removes all of the clinic's data in one step.
-- Patient records linked to OTHER clinics keep existing; their user_id is set
-- to NULL (patients.user_id ON DELETE SET NULL), so history isn't destroyed for
-- those clinics — the account is just unlinked from them.
--
-- The function is SECURITY DEFINER so it can touch auth.users; it only ever
-- deletes the *caller's own* row (auth.uid()), so a user can never delete
-- anyone else.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
