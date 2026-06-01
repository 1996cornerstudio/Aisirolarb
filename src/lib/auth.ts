import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Profile, Role } from "./types";

/**
 * Returns the signed-in user's profile, or null when not authenticated.
 * Use in Server Components / Route Handlers.
 */
export async function getProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (data as Profile | null) ?? null;
}

/**
 * Guard for a page that requires a specific role. Redirects to /login when the
 * visitor is anonymous, or to their own dashboard when the role doesn't match.
 */
export async function requireRole(role: Role): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== role) {
    redirect(profile.role === "admin" ? "/dashboard/admin" : "/dashboard/employee");
  }
  return profile;
}
