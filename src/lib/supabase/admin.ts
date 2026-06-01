import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Privileged, service-role Supabase client. It BYPASSES Row Level Security and
 * can manage other users (create / delete / reset password), so it must ONLY
 * ever be used inside server code (Server Actions / Route Handlers) — never in
 * a Client Component. The key is read from `SUPABASE_SERVICE_ROLE_KEY`, which
 * must be a server-only env var (no NEXT_PUBLIC_ prefix).
 */
export function createAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local (and Vercel) " +
        "from Supabase → Settings → API → service_role key."
    );
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** True when the service-role key is configured (used to show a setup hint). */
export function hasAdminCredentials(): boolean {
  return Boolean(supabaseUrl && serviceRoleKey);
}
