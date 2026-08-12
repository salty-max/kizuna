import { createContext } from "react";

import type { Locale } from "./locales";
import type { Translator } from "./translate";

export interface I18nContextValue extends Translator {
  setLocale: (locale: Locale) => void;
  /**
   * When true, player names use the game's "original names" field — romanised
   * Japanese (Endo Mamoru) rather than the localised Western form (Mark Evans).
   * Mirrors the in-game toggle; only meaningful for players.
   */
  showOriginalNames: boolean;
  setShowOriginalNames: (value: boolean) => void;
}

export const I18nContext = createContext<I18nContextValue | null>(null);
