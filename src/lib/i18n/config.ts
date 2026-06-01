export const LOCALES = ["en", "th", "my"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "th";
export const LOCALE_COOKIE = "lang";

export const LOCALE_META: Record<
  Locale,
  { label: string; flag: string; intl: string }
> = {
  en: { label: "English", flag: "🇬🇧", intl: "en-GB" },
  th: { label: "ไทย", flag: "🇹🇭", intl: "th-TH" },
  my: { label: "မြန်မာ", flag: "🇲🇲", intl: "my-MM" },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && LOCALES.includes(value as Locale);
}

/** Coerce any input to a supported locale, falling back to the default. */
export function normalizeLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/**
 * Pick the best matching locale from a raw Accept-Language header,
 * e.g. "my-MM,my;q=0.9,en;q=0.8" -> "my".
 */
export function detectFromAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  const parts = header
    .split(",")
    .map((p) => p.trim().split(";")[0].toLowerCase());
  for (const p of parts) {
    const base = p.split("-")[0];
    if (isLocale(base)) return base;
  }
  return null;
}
