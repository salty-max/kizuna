import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { ThemeContext, type ThemeContextValue } from "./theme-context-internal";
import {
  DEFAULT_THEME,
  loadTheme,
  prefersDark,
  resolveTheme,
  storeTheme,
  type ThemeChoice,
} from "./theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>(() => {
    if (typeof window === "undefined") return DEFAULT_THEME;
    return loadTheme();
  });
  const [systemDark, setSystemDark] = useState(() => {
    if (typeof window === "undefined") return true;
    return prefersDark();
  });

  // Kept live rather than read once: `system` is a standing subscription to the
  // OS, so a machine switching at dusk has to carry the app with it.
  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia("(prefers-color-scheme: light)");
    const sync = () => setSystemDark(!query.matches);
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const setChoice = useCallback((next: ThemeChoice) => {
    setChoiceState(next);
    storeTheme(next);
  }, []);

  const resolved = resolveTheme(choice, systemDark);

  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
  }, [resolved]);

  const value = useMemo<ThemeContextValue>(
    () => ({ choice, resolved, setChoice }),
    [choice, resolved, setChoice],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
