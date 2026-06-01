# Employee Attendance & OT Management

A modern attendance + overtime dashboard built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase** (database + storage).

## Features

- 🔐 **Role-based auth** — email/password login & signup via Supabase Auth, split into `employee` and `admin` roles.
- 🧭 **Protected routing** — Next.js middleware redirects anonymous users to `/login` and keeps employees out of admin pages.
- 📱 **Employee view** (`/dashboard/employee`) — mobile-first check-in/out with a live clock, camera capture, success animation, and a personal history timeline.
- 📊 **Admin view** (`/dashboard/admin`) — desktop dashboard with summary cards, a master attendance table (photo hover previews, OT/remark highlighting), filters, and inline record editing.
- ⏱️ **OT logic** — 9 standard hours/day with a 1-hour break; anything beyond counts as OT.
- 📸 **Photo capture** — Check-In / Check-Out photos uploaded to Supabase Storage.

## OT calculation

```
grossHours    = time_out - time_in           (raw clocked span)
netWorkHours  = grossHours - 1h break
otHours       = max(0, netWorkHours - 9)
```

Example: in `09:45:01`, out `21:10:00` → gross `11.42h` → net `10.42h` → **OT `1.4h`**.

## 1. Database setup

Run these scripts in order in your Supabase project → **SQL Editor** → **New query**:

1. [`supabase/schema.sql`](./supabase/schema.sql) — base `attendance` table, indexes, `updated_at` trigger, and the public `attendance-photos` storage bucket.
2. [`supabase/auth.sql`](./supabase/auth.sql) — `profiles` table, the signup trigger that auto-creates a profile and resolves the role from the **secret admin code**, the `user_id` column on `attendance`, and role-aware RLS policies.
3. [`supabase/settings.sql`](./supabase/settings.sql) — `app_settings` (global OT / shift defaults), the `branches` table, per-employee OT override columns on `profiles`, and their RLS policies. Required for the **Admin → Settings** page.

### Auth configuration

- **Admin code:** the secret lives in `handle_new_user()` inside `auth.sql` (default `ADMIN123`). Anyone who enters it at signup becomes an `admin`; everyone else is an `employee`. The role is decided in the database, never trusted from the browser.
- **Email confirmation:** for a frictionless local demo, disable it under **Authentication → Providers → Email → Confirm email**. Otherwise new users must confirm via email before they can sign in.

## 2. Environment variables

`.env.local` (already filled in for this project):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key

# Server-only — required for admins to CREATE / DELETE / RESET users in Settings.
# Get it from Supabase → Settings → API → service_role secret.
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret
```

> ⚠️ Never put the **service_role** key in `NEXT_PUBLIC_*` or in client code. It is
> only read server-side in `src/lib/supabase/admin.ts`. Add the same variable to
> your Vercel project's **Environment Variables** before deploying.

## 3. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Project structure

```
attendance-app/
├─ middleware.ts              # auth + role-based route protection
├─ supabase/
│  ├─ schema.sql              # base attendance table + storage bucket
│  ├─ auth.sql                # profiles, signup trigger, role RLS
│  └─ settings.sql            # app_settings, branches, per-employee OT overrides
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx
│  │  ├─ globals.css
│  │  ├─ page.tsx             # redirects to the role dashboard
│  │  ├─ login/               # /login page + form
│  │  ├─ signup/              # /signup page + form
│  │  ├─ auth/actions.ts      # signIn / signUp / signOut server actions
│  │  └─ dashboard/
│  │     ├─ page.tsx          # role dispatcher
│  │     ├─ employee/         # mobile-first employee view
│  │     └─ admin/            # desktop admin dashboard
│  ├─ components/
│  │  ├─ CameraCapture.tsx    # camera preview + file fallback
│  │  ├─ LogoutButton.tsx
│  │  └─ … (legacy combined dashboard components)
│  └─ lib/
│     ├─ supabase/            # ssr browser / server / middleware clients
│     ├─ supabaseClient.ts    # shared browser client + helpers
│     ├─ auth.ts              # getProfile / requireRole guards
│     ├─ types.ts
│     └─ attendance.ts        # OT / working-hours logic
├─ .env.local
└─ package.json
```
