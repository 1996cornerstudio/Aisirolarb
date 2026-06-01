"use client";

import { Globe } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { LOCALES, LOCALE_META, type Locale } from "@/lib/i18n/config";

/**
 * Compact language selector. Uses a native <select> for accessibility and
 * reliable behaviour on mobile. Two visual tones to fit light and dark headers.
 */
export default function LanguageSwitcher({
  tone = "light",
}: {
  tone?: "light" | "dark";
}) {
  const { locale, setLocale } = useI18n();

  const base =
    "appearance-none rounded-lg border py-1.5 pl-7 pr-7 text-sm font-medium shadow-sm outline-none transition cursor-pointer focus:ring-2";
  const toneClass =
    tone === "dark"
      ? "border-white/20 bg-white/10 text-white focus:ring-white/30 [&>option]:text-slate-900"
      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:border-brand-500 focus:ring-brand-100";

  return (
    <div className="relative inline-flex items-center">
      <Globe
        size={15}
        className={`pointer-events-none absolute left-2 ${
          tone === "dark" ? "text-white/80" : "text-slate-400"
        }`}
      />
      <select
        aria-label="Language"
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className={`${base} ${toneClass}`}
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {LOCALE_META[l].flag} {LOCALE_META[l].label}
          </option>
        ))}
      </select>
      <svg
        className={`pointer-events-none absolute right-2 h-3.5 w-3.5 ${
          tone === "dark" ? "text-white/80" : "text-slate-400"
        }`}
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );
}
