"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_LOCALE,
  getChatTranslations,
  LOCALE_STORAGE_KEY,
  type Locale,
  normalizeLocale,
} from "@/lib/i18n";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: ReturnType<typeof getChatTranslations>;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function getCookieLocale() {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${LOCALE_STORAGE_KEY}=`))
    ?.split("=")[1];
}

function persistLocale(locale: Locale) {
  const maxAge = 60 * 60 * 24 * 365;
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  // biome-ignore lint/suspicious/noDocumentCookie: needed for client-side preference persistence
  document.cookie = `${LOCALE_STORAGE_KEY}=${encodeURIComponent(locale)}; path=/; max-age=${maxAge}`;
}

function getHtmlLang(locale: Locale) {
  return locale === "zh" ? "zh-CN" : "en";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const savedLocale = normalizeLocale(
      localStorage.getItem(LOCALE_STORAGE_KEY) ??
        (getCookieLocale() ? decodeURIComponent(getCookieLocale() ?? "") : null)
    );

    setLocaleState(savedLocale);
  }, []);

  useEffect(() => {
    document.documentElement.lang = getHtmlLang(locale);
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    const normalizedLocale = normalizeLocale(nextLocale);
    persistLocale(normalizedLocale);
    setLocaleState(normalizedLocale);
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: getChatTranslations(locale),
    }),
    [locale, setLocale]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider");
  }

  return context;
}
