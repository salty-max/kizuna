/**
 * UI + asset locales. Align with the dataminer bundles (`ievr.{fr,en,ja}.json`)
 * and the localised position badge atlases (`icon_position_*.{fr,en,ja}.png`).
 */

export const LOCALES = ["fr", "en", "ja"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "fr";

export const LOCALE_LABELS: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  ja: "日本語",
};

/** BCP 47 tags for `Intl` formatters. */
export const LOCALE_INTL: Record<Locale, string> = {
  fr: "fr-FR",
  en: "en-US",
  ja: "ja-JP",
};

const STORAGE_KEY = "kizuna.locale";
const ORIGINAL_NAMES_KEY = "kizuna.showOriginalNames";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Browser language → closest supported locale. */
export function detectLocale(language = navigator.language): Locale {
  const primary = language.toLowerCase().split("-")[0] ?? "";
  if (primary === "fr") return "fr";
  if (primary === "ja") return "ja";
  if (primary === "en") return "en";
  return DEFAULT_LOCALE;
}

function loadStoredLocale(): Locale | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isLocale(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function storeLocale(locale: Locale): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // private mode / full quota
  }
}

export function initialLocale(): Locale {
  return loadStoredLocale() ?? detectLocale();
}

export function loadShowOriginalNames(): boolean {
  try {
    return window.localStorage.getItem(ORIGINAL_NAMES_KEY) === "1";
  } catch {
    return false;
  }
}

export function storeShowOriginalNames(value: boolean): void {
  try {
    window.localStorage.setItem(ORIGINAL_NAMES_KEY, value ? "1" : "0");
  } catch {
    // private mode / full quota
  }
}
