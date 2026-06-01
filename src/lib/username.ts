/**
 * Username-based login on top of Supabase email auth.
 *
 * Supabase Auth is email-based, so we map a username to a synthetic email
 * (`<username>@attendance.local`). Users never see this — they sign up and log
 * in with just a username + password. If the input already looks like an email
 * (contains "@"), it is used as-is, so older email accounts keep working.
 */
export const USERNAME_EMAIL_DOMAIN = "attendance.local";

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function looksLikeEmail(value: string): boolean {
  return value.includes("@");
}

/** Convert a username (or pass-through email) to the auth email. */
export function identifierToEmail(value: string): string {
  const v = normalizeUsername(value);
  return looksLikeEmail(v) ? v : `${v}@${USERNAME_EMAIL_DOMAIN}`;
}

/** Allowed: 3+ chars, lowercase letters / digits / . _ - */
export function isValidUsername(value: string): boolean {
  return /^[a-z0-9._-]{3,}$/.test(normalizeUsername(value));
}
