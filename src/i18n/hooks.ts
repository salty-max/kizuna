import { useContext } from "react";

import { I18nContext } from "./context-internal";
import type { MessageKey } from "./translate";

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside LocaleProvider");
  return ctx;
}

/** Convenience alias — most call sites only need `t`. */
export function useT(): (key: MessageKey, params?: Record<string, string | number>) => string {
  return useI18n().t;
}
