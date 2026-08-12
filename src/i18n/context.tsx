import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { I18nContext, type I18nContextValue } from "./context-internal";
import {
  DEFAULT_LOCALE,
  initialLocale,
  loadShowOriginalNames,
  storeLocale,
  storeShowOriginalNames,
  type Locale,
} from "./locales";
import { createTranslator } from "./translate";

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") return DEFAULT_LOCALE;
    return initialLocale();
  });
  const [showOriginalNames, setShowOriginalNamesState] = useState(() => {
    if (typeof window === "undefined") return false;
    return loadShowOriginalNames();
  });

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    storeLocale(next);
  }, []);

  const setShowOriginalNames = useCallback((value: boolean) => {
    setShowOriginalNamesState(value);
    storeShowOriginalNames(value);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => {
    const translator = createTranslator(locale);
    return { ...translator, setLocale, showOriginalNames, setShowOriginalNames };
  }, [locale, setLocale, showOriginalNames, setShowOriginalNames]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
