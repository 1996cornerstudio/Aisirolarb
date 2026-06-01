-- =============================================================
-- Role-Based Authentication — Supabase schema (run AFTER schema.sql)
-- Run this in: Supabase Dashboard -> SQL Editor -> New query
--
-- This script is idempotent and additive. It:
--   1) Creates a `profiles` table linked 1:1 with auth.users
--   2) Auto-creates a profile row on signup (DB trigger) and
--      derives the role from a secret Admin Code passed at signup
--   3) Adds `user_id` to `attendance` and links it to auth.users
--   4) Replaces the open RLS policies with role-aware ones
-- =============================================================

-- 1) PROFILES TABLE -------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text        not null,
  branch      text,
  role        text        not null default 'employee'
                check (role in ('employee', 'admin')),
  language    text        not null default 'th'
                check (language in ('en', 'th', 'my')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- For existing databases created before V2 (idempotent):
alter table public.profiles
  add column if not exists language text not null default 'th';

alter table public.profiles
  add column if not exists username text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_language_check'
  ) then
    alter table public.profiles
      add constraint profiles_language_check check (language in ('en', 'th', 'my'));
  end if;
end$$;

-- Backfill a username for any legacy account from its email local-part.
update public.profiles p
   set username = lower(split_part(u.email, '@', 1))
  from auth.users u
 where u.id = p.id
   and (p.username is null or p.username = '');

create index if not exists profiles_role_idx   on public.profiles (role);
create index if not exists profiles_branch_idx on public.profiles (branch);
create unique index if not exists profiles_username_key
  on public.profiles (username) where username is not null;

-- keep updated_at fresh (reuses set_updated_at() from schema.sql)
drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 2) ROLE HELPER ----------------------------------------------
-- SECURITY DEFINER so it bypasses RLS and avoids policy recursion
-- (a profiles policy that itself reads profiles would recurse).
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- 3) AUTO-CREATE PROFILE ON SIGNUP ----------------------------
-- The role is decided HERE (server side), never trusted from the
-- client. The signup form passes `admin_code` in user metadata;
-- only the matching secret promotes the account to 'admin'.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  -- 🔐 Change this secret to whatever you like.
  admin_secret constant text := 'ADMIN123';
  resolved_role text := 'employee';
  resolved_lang text := 'th';
begin
  if coalesce(new.raw_user_meta_data ->> 'admin_code', '') = admin_secret then
    resolved_role := 'admin';
  end if;

  -- Inherit the UI language the user was browsing in at signup.
  if (new.raw_user_meta_data ->> 'lang') in ('en', 'th', 'my') then
    resolved_lang := new.raw_user_meta_data ->> 'lang';
  end if;

  insert into public.profiles (id, name, branch, role, language, username)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data ->> 'branch', ''),
    resolved_role,
    resolved_lang,
    coalesce(
      nullif(lower(new.raw_user_meta_data ->> 'username'), ''),
      lower(split_part(new.email, '@', 1))
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4) PROFILES RLS ---------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.current_user_role() = 'admin');

-- Users can update their own profile, but NOT escalate their role.
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.current_user_role());

-- Admins can manage every profile.
drop policy if exists "profiles_admin_manage" on public.profiles;
create policy "profiles_admin_manage"
  on public.profiles for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- 5) ATTENDANCE: link to the auth user --------------------------
alter table public.attendance
  add column if not exists user_id uuid references auth.users (id) on delete set null;

create index if not exists attendance_user_id_idx on public.attendance (user_id);

-- Replace the open demo policies with role-aware ones.
drop policy if exists "attendance_select_all" on public.attendance;
drop policy if exists "attendance_insert_all" on public.attendance;
drop policy if exists "attendance_update_all" on public.attendance;

-- Employees see only their own rows; admins see everything
-- (including legacy seed rows that have a null user_id).
drop policy if exists "attendance_select_scoped" on public.attendance;
create policy "attendance_select_scoped"
  on public.attendance for select
  to authenticated
  using (user_id = auth.uid() or public.current_user_role() = 'admin');

-- A user may only insert rows attributed to themselves.
drop policy if exists "attendance_insert_self" on public.attendance;
create policy "attendance_insert_self"
  on public.attendance for insert
  to authenticated
  with check (user_id = auth.uid());

-- Employees can update their own rows; admins can edit any row
-- (e.g. fix the REMARK field or adjust timestamps).
drop policy if exists "attendance_update_scoped" on public.attendance;
create policy "attendance_update_scoped"
  on public.attendance for update
  to authenticated
  using (user_id = auth.uid() or public.current_user_role() = 'admin')
  with check (user_id = auth.uid() or public.current_user_role() = 'admin');

-- 6) STORAGE: require an authenticated user to upload photos -----
drop policy if exists "attendance_photos_insert" on storage.objects;
create policy "attendance_photos_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'attendance-photos');
