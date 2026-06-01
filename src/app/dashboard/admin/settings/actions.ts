"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isLocale } from "@/lib/i18n/config";

export interface ActionResult {
  ok?: boolean;
  /** Translatable status code our UI maps to a localized message. */
  code?:
    | "created"
    | "updated"
    | "deleted"
    | "passwordReset"
    | "branchAdded"
    | "branchRemoved"
    | "required"
    | "passwordShort"
    | "forbidden"
    | "noServiceKey"
    | "error";
  /** Raw error text from Supabase, when present. */
  error?: string;
}

/** Throws-free admin guard: returns the user id when the caller is an admin. */
async function requireAdmin(): Promise<{ id: string } | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!data || data.role !== "admin") return null;
  return { id: user.id };
}

function revalidate() {
  revalidatePath("/dashboard/admin/settings");
  revalidatePath("/dashboard/admin");
}

function num(value: FormDataEntryValue | null): number | null {
  const s = String(value ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function timeOrNull(value: FormDataEntryValue | null): string | null {
  const s = String(value ?? "").trim();
  return s === "" ? null : s;
}

/** Create a brand-new user with an email + password set by the admin. */
export async function createUserAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  if (!(await requireAdmin())) return { code: "forbidden" };

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const branch = String(formData.get("branch") ?? "").trim();
  const role = String(formData.get("role") ?? "employee") === "admin" ? "admin" : "employee";
  const lang = String(formData.get("language") ?? "th");

  if (!email || !password || !name) return { code: "required" };
  if (password.length < 6) return { code: "passwordShort" };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { code: "noServiceKey" };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name,
      branch,
      lang: isLocale(lang) ? lang : "th",
    },
  });

  if (error) return { code: "error", error: error.message };

  // The DB trigger creates the profile row as 'employee'; promote / set branch
  // explicitly here (service role bypasses RLS).
  if (data.user) {
    await admin
      .from("profiles")
      .update({ role, branch: branch || null, name })
      .eq("id", data.user.id);
  }

  revalidate();
  return { ok: true, code: "created" };
}

/** Update an existing employee's role, branch and per-employee OT overrides. */
export async function updateEmployeeAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  if (!(await requireAdmin())) return { code: "forbidden" };

  const id = String(formData.get("id") ?? "");
  if (!id) return { code: "required" };

  const role = String(formData.get("role") ?? "employee") === "admin" ? "admin" : "employee";
  const branch = String(formData.get("branch") ?? "").trim();

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      role,
      branch: branch || null,
      standard_hours: num(formData.get("standard_hours")),
      break_hours: num(formData.get("break_hours")),
      shift_start: timeOrNull(formData.get("shift_start")),
      shift_end: timeOrNull(formData.get("shift_end")),
      late_grace_minutes: num(formData.get("late_grace_minutes")),
    })
    .eq("id", id);

  if (error) return { code: "error", error: error.message };

  revalidate();
  return { ok: true, code: "updated" };
}

/** Admin resets a user's password. */
export async function resetPasswordAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  if (!(await requireAdmin())) return { code: "forbidden" };

  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!id || !password) return { code: "required" };
  if (password.length < 6) return { code: "passwordShort" };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { code: "noServiceKey" };
  }

  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) return { code: "error", error: error.message };

  return { ok: true, code: "passwordReset" };
}

/** Permanently delete a user (their profile cascades via FK). */
export async function deleteUserAction(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  try {
    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(id);
  } catch {
    // No service key configured — nothing we can do server-side.
    return;
  }

  revalidate();
}

/** Update the global OT / shift defaults (single row). */
export async function updateSettingsAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  if (!(await requireAdmin())) return { code: "forbidden" };

  const supabase = createClient();
  const { error } = await supabase
    .from("app_settings")
    .update({
      standard_hours: num(formData.get("standard_hours")) ?? 9,
      break_hours: num(formData.get("break_hours")) ?? 1,
      shift_start: timeOrNull(formData.get("shift_start")) ?? "09:00",
      shift_end: timeOrNull(formData.get("shift_end")) ?? "18:00",
      late_grace_minutes: num(formData.get("late_grace_minutes")) ?? 15,
    })
    .eq("id", 1);

  if (error) return { code: "error", error: error.message };

  revalidate();
  return { ok: true, code: "updated" };
}

/** Add a branch. */
export async function addBranchAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  if (!(await requireAdmin())) return { code: "forbidden" };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { code: "required" };

  const supabase = createClient();
  const { error } = await supabase.from("branches").insert({ name });
  if (error) return { code: "error", error: error.message };

  revalidate();
  return { ok: true, code: "branchAdded" };
}

/** Remove a branch by id. */
export async function deleteBranchAction(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  await supabase.from("branches").delete().eq("id", id);

  revalidate();
}
