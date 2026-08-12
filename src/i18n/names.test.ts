import { describe, expect, test } from "bun:test";

import {
  abilityDisplayName,
  contributionPlayerName,
  playerDisplayName,
  playerInitials,
} from "./names";

describe("playerDisplayName", () => {
  const player = { name: "Mark Evans", nameOriginal: "Endo Mamoru" };

  test("defaults to the localised name", () => {
    expect(playerDisplayName(player, false)).toBe("Mark Evans");
  });

  test("switches to the romanised original when asked", () => {
    expect(playerDisplayName(player, true)).toBe("Endo Mamoru");
  });

  test("falls back to name when original is empty", () => {
    expect(playerDisplayName({ name: "Foo", nameOriginal: "" }, true)).toBe("Foo");
  });

  test("handles null", () => {
    expect(playerDisplayName(null, true)).toBe("");
  });
});

describe("contributionPlayerName", () => {
  test("picks original when the toggle is on", () => {
    expect(
      contributionPlayerName(
        { fromPlayerName: "Mark Evans", fromPlayerNameOriginal: "Endo Mamoru" },
        true,
      ),
    ).toBe("Endo Mamoru");
  });
});

describe("playerInitials", () => {
  test("takes the first letter of the first two words", () => {
    expect(playerInitials("Endo Mamoru")).toBe("EM");
  });
});

describe("abilityDisplayName", () => {
  const ability = {
    id: "1",
    name: "Main céleste",
    names: { fr: "Main céleste", en: "God Hand", ja: "ゴッドハンド" },
    kind: "hissatsu" as const,
    auraType: null,
    type: "Catch",
    element: "Mountain" as const,
    power: 80,
    tension: 50,
    extra: "",
    shop: "",
  };

  test("follows the UI locale", () => {
    expect(abilityDisplayName(ability, "fr")).toBe("Main céleste");
    expect(abilityDisplayName(ability, "en")).toBe("God Hand");
    expect(abilityDisplayName(ability, "ja")).toBe("ゴッドハンド");
  });
});
