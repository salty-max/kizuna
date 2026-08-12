import { describe, expect, test } from "bun:test";

import { createTranslator } from "./translate";
import { positionBadgePath } from "@/lib/icons";

describe("i18n", () => {
  test("looks up nested keys", () => {
    const { t } = createTranslator("fr");
    expect(t("app.share")).toBe("Partager");
  });

  test("interpolates params", () => {
    const { t } = createTranslator("en");
    expect(t("violations.heroLimit", { count: 3, max: 2 })).toContain("3");
    expect(t("violations.heroLimit", { count: 3, max: 2 })).toContain("2");
  });

  test("picks plural form when count !== 1", () => {
    const { t } = createTranslator("en");
    expect(t("pitch.passivesCount", { n: 1 })).toBe("1 passive");
    expect(t("pitch.passivesCount", { n: 3 })).toBe("3 passives");
  });

  test("covers fr, en and ja for a core key", () => {
    expect(createTranslator("fr").t("app.language")).toBe("Langue");
    expect(createTranslator("en").t("app.language")).toBe("Language");
    expect(createTranslator("ja").t("app.language")).toBe("言語");
  });

  test("position badge paths follow the locale", () => {
    expect(positionBadgePath("GK", "fr")).toContain(".fr.png");
    expect(positionBadgePath("GK", "en")).toContain(".en.png");
    expect(positionBadgePath("GK", "ja")).toContain(".ja.png");
  });
});
