/**
 * Colour themes.
 *
 * `system` is a real third value, not a synonym for one of the other two: it
 * means "keep following the OS", so a reader who never chose stays in step when
 * their machine switches at dusk. Only `dark` and `light` are ever written to
 * the document.
 */

export const THEME_CHOICES = ["system", "dark", "light"] as const;
export type ThemeChoice = (typeof THEME_CHOICES)[number];

/** What actually ends up on `<html data-theme>`. */
export type ResolvedTheme = "dark" | "light";

export const DEFAULT_THEME: ThemeChoice = "system";

const STORAGE_KEY = "kizuna.theme";

function isThemeChoice(value: unknown): value is ThemeChoice {
  return typeof value === "string" && (THEME_CHOICES as readonly string[]).includes(value);
}

export function prefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return true;
  return !window.matchMedia("(prefers-color-scheme: light)").matches;
}

export function resolveTheme(choice: ThemeChoice, systemPrefersDark: boolean): ResolvedTheme {
  if (choice === "system") return systemPrefersDark ? "dark" : "light";
  return choice;
}

export function loadTheme(): ThemeChoice {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isThemeChoice(stored) ? stored : DEFAULT_THEME;
  } catch {
    // Private browsing and blocked storage both throw here. The theme is a
    // preference, not state worth failing over.
    return DEFAULT_THEME;
  }
}

export function storeTheme(choice: ThemeChoice): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    /* see loadTheme */
  }
}
