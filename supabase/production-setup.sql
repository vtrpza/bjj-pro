-- Production setup script for BJJ Academia PWA
-- Run this AFTER `supabase db push` to verify and seed production data.
-- This script is idempotent and safe to run multiple times.

-- ============================================================
-- 1. Verify all tables exist
-- ============================================================
do $$
declare
  expected_tables text[] := array[
    'academies', 'profiles', 'academy_members', 'bjj_belts',
    'students', 'training_sessions', 'checkins', 'payments',
    'asaas_customers', 'asaas_payment_events', 'expenses',
    'graduation_rules', 'audit_logs'
  ];
  missing_tables text[] := array[]::text[];
  tbl text;
begin
  foreach tbl in array expected_tables loop
    if not exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = tbl
    ) then
      missing_tables := array_append(missing_tables, tbl);
    end if;
  end loop;

  if array_length(missing_tables, 1) > 0 then
    raise exception 'Missing tables: %', array_to_string(missing_tables, ', ');
  else
    raise notice 'All 13 tables verified present.';
  end if;
end $$;

-- ============================================================
-- 2. Verify RLS is enabled on all tables
-- ============================================================
do $$
declare
  rls_tables text[];
  tbl record;
begin
  select array_agg(tablename) into rls_tables
  from pg_tables
  where schemaname = 'public'
    and tablename not like 'pg_%'
    and tablename not like 'sql_%'
    and tablename <> 'audit_logs';

  for tbl in
    select tablename
    from pg_tables
    where schemaname = 'public'
      and tablename = any(rls_tables)
      and rowsecurity = false
  loop
    raise warning 'RLS not enabled on table: %', tbl.tablename;
  end loop;

  raise notice 'RLS verification complete. Check warnings above for any tables without RLS.';
end $$;

-- ============================================================
-- 3. Seed pilot academy data (idempotent)
-- ============================================================

-- Pilot academy
insert into public.academies (id, name, slug, timezone)
values (
  '11111111-1111-4111-8111-111111111111',
  'Academia Piloto de Jiu-Jitsu',
  'academia-piloto-jiu-jitsu',
  'America/Sao_Paulo'
)
on conflict (id) do update
set
  name = excluded.name,
  slug = excluded.slug,
  timezone = excluded.timezone;

-- BJJ belt paths (adult and kids)
insert into public.bjj_belts (audience, name, rank, max_grau)
values
  ('adult', 'Branca', 1, 4),
  ('adult', 'Azul', 2, 4),
  ('adult', 'Roxa', 3, 4),
  ('adult', 'Marrom', 4, 4),
  ('adult', 'Preta', 5, 4),
  ('adult', 'Coral', 6, 0),
  ('adult', 'Vermelha', 7, 0),
  ('kids', 'Branca', 1, 4),
  ('kids', 'Cinza', 2, 4),
  ('kids', 'Amarela', 3, 4),
  ('kids', 'Laranja', 4, 4),
  ('kids', 'Verde', 5, 4)
on conflict (audience, name) do update
set
  rank = excluded.rank,
  max_grau = excluded.max_grau;

-- Graduation rules for pilot academy
insert into public.graduation_rules (academy_id, belt_id, grau, required_checkins, minimum_days, active)
select
  '11111111-1111-4111-8111-111111111111'::uuid as academy_id,
  belt.id as belt_id,
  rule.grau,
  rule.required_checkins,
  rule.minimum_days,
  true as active
from public.bjj_belts belt
cross join lateral (
  values
    (0, case when belt.audience = 'kids' then 12 when belt.name = 'Branca' then 20 else 30 end, 30),
    (1, case when belt.audience = 'kids' then 16 when belt.name = 'Branca' then 25 else 35 end, 45),
    (2, case when belt.audience = 'kids' then 20 when belt.name = 'Branca' then 30 else 40 end, 60),
    (3, case when belt.audience = 'kids' then 24 when belt.name = 'Branca' then 35 else 45 end, 75)
) as rule(grau, required_checkins, minimum_days)
where belt.max_grau > 0
  and rule.grau < belt.max_grau
on conflict (coalesce(academy_id, '00000000-0000-0000-0000-000000000000'::uuid), belt_id, grau) do update
set
  required_checkins = excluded.required_checkins,
  minimum_days = excluded.minimum_days,
  active = excluded.active;

raise notice 'Pilot academy data seeded successfully.';

-- ============================================================
-- 4. Test admin user creation
-- ============================================================
-- IMPORTANT: This creates a test admin user for initial setup.
-- The password MUST be changed immediately after first login.
--
-- To create a test admin user:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add user" > "Create new user"
-- 3. Email: admin@academia-piloto.test
-- 4. Password: ChangeMe123! (CHANGE IMMEDIATELY)
-- 5. After creating, note the user ID and run:
--
--    insert into public.profiles (id, full_name)
--    values ('<USER_ID_FROM_SUPABASE>', 'Admin Teste');
--
--    insert into public.academy_members (academy_id, user_id, role, status, joined_at)
--    values (
--      '11111111-1111-4111-8111-111111111111',
--      '<USER_ID_FROM_SUPABASE>',
--      'admin',
--      'active',
--      now()
--    );
--
-- 6. Log in and change password immediately.
--
-- DO NOT automate user creation in production — use Supabase dashboard
-- or proper invite flow for security.

raise notice 'Production setup complete. Follow the instructions above to create a test admin user.';
