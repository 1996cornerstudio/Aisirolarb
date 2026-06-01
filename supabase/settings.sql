-- =============================================================
-- Admin Settings — Supabase schema (run AFTER auth.sql)
-- Run this in: Supabase Dashboard -> SQL Editor -> New query
--
-- This script is idempotent and additive. It adds:
--   1) A single-row `app_settings` table (global OT / shift defaults)
--   2) A `branches` table (managed in the Settings page)
--   3) Per-employee override columns on `profiles`
--   4) RLS so everyone can read settings/branches, only admins write
-- =============================================================

-- 1) GLOBAL APP SETTINGS (single row, id = 1) ------------------
create table if not exists public.app_settings (
  id                  smallint primary key default 1 check (id = 1),
  standard_hours      numeric not null default 9,    -- net work hours / day before OT
  break_hours         numeric not null default 1,    -- unpaid break removed from gross
  shift_start         time    not null default '09:00',
  shift_end           time    not null default '18:00',
  late_grace_minutes  integer not null default 15,   -- minutes after shift_start before "late"
  updated_at          timestamptz not null default now()
);

-- Ensure the single config row always exists.
insert into public.app_settings (id) values (1)
  on conflict (id) do nothing;

drop trigger if exists trg_app_settings_updated_at on public.app_settings;
create trigger trg_app_settings_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

-- 2) BRANCHES -------------------------------------------------
create table if not exists public.branches (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  created_at  timestamptz not null default now()
);

-- Seed branch list from whatever already exists in the data.
insert into public.branches (name)
select distinct branch
from (
  select branch from public.attendance where branch is not null and branch <> ''
  union
  select branch from public.profiles where branch is not null and branch <> ''
) s
on conflict (name) do nothing;

-- 3) PER-EMPLOYEE OVERRIDES (nullable -> falls back to global) -
alter table public.profiles
  add column if not exists standard_hours     numeric,
  add column if not exists break_hours        numeric,
  add column if not exists shift_start        time,
  add column if not exists shift_end          time,
  add column if not exists late_grace_minutes integer;

-- 4) RLS ------------------------------------------------------
alter table public.app_settings enable row level security;
alter table public.branches     enable row level security;

-- Everyone signed in can read the global settings; only admins change them.
drop policy if exists "app_settings_select_all" on public.app_settings;
create policy "app_settings_select_all"
  on public.app_settings for select
  to authenticated
  using (true);

drop policy if exists "app_settings_admin_write" on public.app_settings;
create policy "app_settings_admin_write"
  on public.app_settings for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Branches are readable by anyone (the public signup form needs them too),
-- but only admins can add / remove them.
drop policy if exists "branches_select_public" on public.branches;
create policy "branches_select_public"
  on public.branches for select
  to anon, authenticated
  using (true);

drop policy if exists "branches_admin_write" on public.branches;
create policy "branches_admin_write"
  on public.branches for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
