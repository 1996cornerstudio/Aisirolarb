"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { dictionaries, type Dictionary } from "./dictionaries";
import { LOCALE_COOKIE, LOCALE_META, type Locale } from "./config";
import { updateLanguageAction } from "@/app/auth/actions";

interface I18nContextValue {
  locale: Locale;
  /** Translation dictionary for the active locale. */
  t: Dictionary;
  /** Intl locale tag, e.g. "th-TH", for date/number formatting. */
  intlLocale: string;
  setLocale: (next: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    // Remember on the device for SSR + anonymous pages.
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    // Persist to the account (no-op when signed out).
    void updateLanguageAction(next);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      t: dictionaries[locale],
      intlLocale: LOCALE_META[locale].intl,
      setLocale,
    }),
    [locale, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}
