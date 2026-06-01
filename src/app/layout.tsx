import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_META,
  detectFromAcceptLanguage,
  isLocale,
  normalizeLocale,
  type Locale,
} from "@/lib/i18n/config";

export const metadata: Metadata = {
  title: "Attendance & OT Management",
  description: "Employee attendance, working hours and overtime dashboard.",
};

/**
 * Resolve the active locale:
 *   - signed in  → the language saved on the account (syncs across devices)
 *   - signed out → device cookie, else the browser's Accept-Language, else default
 */
async function resolveLocale(): Promise<Locale> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("language")
      .eq("id", user.id)
      .maybeSingle();
    if (data?.language) return normalizeLocale(data.language);
  }

  const cookieLocale = cookies().get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) return cookieLocale;

  return (
    detectFromAcceptLanguage(headers().get("accept-language")) ?? DEFAULT_LOCALE
  );
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await resolveLocale();

  return (
    <html lang={LOCALE_META[locale].intl}>
      <body className="min-h-screen">
        <I18nProvider initialLocale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
