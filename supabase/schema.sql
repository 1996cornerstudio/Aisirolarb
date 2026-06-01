-- =============================================================
-- Employee Attendance & OT Management — Supabase schema
-- Run this in: Supabase Dashboard -> SQL Editor -> New query
-- =============================================================

-- 1) TABLE -----------------------------------------------------
create table if not exists public.attendance (
  id          bigint generated always as identity primary key,
  branch      text        not null,
  name        text        not null,
  time_in     timestamptz not null default now(),
  photo_in    text,
  time_out    timestamptz,
  photo_out   text,
  remark      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Helpful indexes for filtering / dashboards
create index if not exists attendance_branch_idx   on public.attendance (branch);
create index if not exists attendance_name_idx     on public.attendance (name);
create index if not exists attendance_time_in_idx  on public.attendance (time_in);

-- 2) updated_at trigger ---------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_attendance_updated_at on public.attendance;
create trigger trg_attendance_updated_at
  before update on public.attendance
  for each row execute function public.set_updated_at();

-- 3) Row Level Security ---------------------------------------
-- This is a demo/simulator app using the anon key from the browser,
-- so we open up read + insert + update. Lock this down for production.
alter table public.attendance enable row level security;

drop policy if exists "attendance_select_all" on public.attendance;
create policy "attendance_select_all"
  on public.attendance for select
  using (true);

drop policy if exists "attendance_insert_all" on public.attendance;
create policy "attendance_insert_all"
  on public.attendance for insert
  with check (true);

drop policy if exists "attendance_update_all" on public.attendance;
create policy "attendance_update_all"
  on public.attendance for update
  using (true)
  with check (true);

-- 4) Storage bucket for check-in / check-out photos -----------
insert into storage.buckets (id, name, public)
values ('attendance-photos', 'attendance-photos', true)
on conflict (id) do nothing;

-- Public read of photos
drop policy if exists "attendance_photos_read" on storage.objects;
create policy "attendance_photos_read"
  on storage.objects for select
  using (bucket_id = 'attendance-photos');

-- Allow uploads from the app (demo). Tighten for production.
drop policy if exists "attendance_photos_insert" on storage.objects;
create policy "attendance_photos_insert"
  on storage.objects for insert
  with check (bucket_id = 'attendance-photos');
