"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/config";

export interface AuthResult {
  /** Raw error text from Supabase (already localized-agnostic). */
  error?: string;
  message?: string;
  /** Translatable code for our own validation/success messages. */
  code?:
    | "loginRequired"
    | "signupRequired"
    | "passwordShort"
    | "confirmEmail";
}

/** Email + password sign-in. On success, redirects to the role dispatcher. */
export async function signInAction(
  _prev: AuthResult,
  formData: FormData
): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { code: "loginRequired" };
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
    return { code: "signupRequired" };
  }
  if (password.length < 6) {
    return { code: "passwordShort" };
  }

  const lang = cookies().get(LOCALE_COOKIE)?.value;

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        branch,
        admin_code: adminCode,
        lang: isLocale(lang) ? lang : "th",
      },
    },
  });

  if (error) return { error: error.message };

  // If email confirmation is disabled, a session is created immediately.
  if (data.session) redirect("/dashboard");

  // Otherwise the user must confirm via email before signing in.
  return { code: "confirmEmail" };
}

/** Sign the current user out and return to the login screen. */
export async function signOutAction() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Persist the UI language: always on the device (cookie) and, when signed in,
 * on the account so it syncs across devices.
 */
export async function updateLanguageAction(locale: string) {
  if (!isLocale(locale)) return;

  cookies().set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("profiles").update({ language: locale }).eq("id", user.id);
  }
}
