-- BJJ-17: Add checkins_per_grau column to academies table.
-- Controls the number of check-ins required to suggest a grau promotion.

alter table public.academies
  add column if not exists checkins_per_grau integer not null default 8;
