import { describe, expect, test } from "bun:test";

import { DEFAULT_THEME, resolveTheme, THEME_CHOICES } from "./theme";

describe("resolveTheme", () => {
  test("follows the system when nothing was chosen", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  test("an explicit choice overrides the system in both directions", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  test("keeps `system` reachable, or the choice can never go back to the OS", () => {
    expect(THEME_CHOICES).toContain("system");
    expect(DEFAULT_THEME).toBe("system");
  });

  test("only ever resolves to a theme the stylesheet defines", () => {
    for (const choice of THEME_CHOICES) {
      for (const systemDark of [true, false]) {
        expect(["dark", "light"]).toContain(resolveTheme(choice, systemDark));
      }
    }
  });
});
