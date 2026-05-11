-- Add opening_hours column to academies table for structured class schedules

alter table public.academies
  add column if not exists opening_hours jsonb default '{
    "monday": [],
    "tuesday": [],
    "wednesday": [],
    "thursday": [],
    "friday": [],
    "saturday": [],
    "sunday": []
  }'::jsonb;
