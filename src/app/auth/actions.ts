"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AuthResult {
  error?: string;
  message?: string;
}

/** Email + password sign-in. On success, redirects to the role dispatcher. */
export async function signInAction(
  _prev: AuthResult,
  formData: FormData
): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Please enter your email and password." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };

  redirect("/dashboard");
}

/**
 * Sign up a new user. `name`, `branch` and `admin_code` are passed as auth
 * metadata; a database trigger creates the matching `profiles` row and decides
 * the role from the secret admin code (the role is never trusted from here).
 */
export async function signUpAction(
  _prev: AuthResult,
  formData: FormData
): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const branch = String(formData.get("branch") ?? "").trim();
  const adminCode = String(formData.get("adminCode") ?? "").trim();

  if (!email || !password || !name) {
    return { error: "Name, email and password are required." };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, branch, admin_code: adminCode },
    },
  });

  if (error) return { error: error.message };

  // If email confirmation is disabled, a session is created immediately.
  if (data.session) redirect("/dashboard");

  // Otherwise the user must confirm via email before signing in.
  return {
    message:
      "Account created! Check your email to confirm your address, then sign in.",
  };
}

/** Sign the current user out and return to the login screen. */
export async function signOutAction() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
