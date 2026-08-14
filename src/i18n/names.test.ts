import { describe, expect, test } from "bun:test";

import {
  abilityDisplayName,
  contributionPlayerName,
  playerCardName,
  playerDisplayName,
  playerInitials,
} from "./names";

describe("playerDisplayName", () => {
  const player = {
    name: "Mark Evans",
    names: { fr: "Mark Evans", en: "Mark Evans", ja: "円堂 守" },
    nameOriginal: "Endo Mamoru",
    nickname: "Evans",
    nicknames: { fr: "Evans", en: "Evans", ja: "円堂" },
  };

  test("defaults to the localised name", () => {
    expect(playerDisplayName(player, false, "en")).toBe("Mark Evans");
  });

  test("follows the UI locale", () => {
    expect(playerDisplayName(player, false, "ja")).toBe("円堂 守");
  });

  test("switches to the romanised original when asked", () => {
    expect(playerDisplayName(player, true, "en")).toBe("Endo Mamoru");
  });

  test("falls back to name when original is empty", () => {
    expect(playerDisplayName({ name: "Foo", names: {}, nameOriginal: "" }, true)).toBe("Foo");
  });

  test("handles null", () => {
    expect(playerDisplayName(null, true)).toBe("");
  });
});

describe("playerCardName", () => {
  const player = {
    name: "Mark Evans",
    names: { fr: "Mark Evans", en: "Mark Evans", ja: "円堂 守" },
    nameOriginal: "Endo Mamoru",
    nickname: "Evans",
    nicknames: { fr: "Evans", en: "Evans", ja: "円堂" },
  };

  test("uses the short local name on cards", () => {
    expect(playerCardName(player, false, "fr")).toBe("Evans");
  });

  test("keeps original names romanised outside the Japanese locale", () => {
    expect(playerCardName(player, true, "fr")).toBe("Endo");
    expect(playerCardName(player, false, "ja")).toBe("円堂");
  });

  test("maps a Japanese given-name nickname to the matching romanised segment", () => {
    expect(
      playerCardName(
        {
          name: "Jim Wraith",
          names: { en: "Jim Wraith", ja: "影野 仁" },
          nameOriginal: "Kageno Jin",
          nickname: "Jim",
          nicknames: { en: "Jim", ja: "仁" },
        },
        true,
        "en",
      ),
    ).toBe("Jin");
  });

  test("falls back to the full display name", () => {
    expect(
      playerCardName(
        { name: "Foo Bar", names: { fr: "Foo Bar" }, nameOriginal: "", nickname: "" },
        false,
      ),
    ).toBe("Foo Bar");
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
    description: "",
    descriptions: {},
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
