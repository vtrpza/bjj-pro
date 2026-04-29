-- Allow re-checkin after correction by replacing the unique constraint with a partial index.
-- The partial index only enforces uniqueness for valid (non-cancelled) check-ins.

alter table public.checkins
  drop constraint checkins_unique_student_session;

create unique index checkins_unique_valid_student_session
  on public.checkins (training_session_id, student_id)
  where status = 'valid';

-- Allow admins to update checkin status for corrections.
create policy checkins_update_for_admins
  on public.checkins for update to authenticated
  using (public.current_user_is_academy_admin(academy_id))
  with check (public.current_user_is_academy_admin(academy_id));
