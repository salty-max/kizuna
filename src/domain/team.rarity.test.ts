import { describe, expect, test } from "bun:test";

import { findFormation } from "./formations";
import {
  countBasaraInSquad,
  countHeroStarters,
  createTeam,
  DEFAULT_FILLED_RARITY,
  filledAssignment,
  isRarityAllowed,
  passiveSourceFor,
  passiveTierForRarity,
  passiveValueForRarity,
  rarityBudget,
} from "./team";
import type { Passive } from "./types";

const formation = findFormation("4-4-2-diamond");

function teamWithRarities(
  pitch: Array<{ slot: string; rarity: "hero" | "basara" | "legendary" | "common" }>,
) {
  const team = createTeam(formation.id);
  for (const { slot, rarity } of pitch) {
    team.slots[slot] = filledAssignment(1, { rarity });
  }
  return team;
}

describe("rarity caps helpers", () => {
  test("filledAssignment defaults to Legendary", () => {
    expect(DEFAULT_FILLED_RARITY).toBe("legendary");
    expect(filledAssignment(42).rarity).toBe("legendary");
    expect(filledAssignment(42).playerId).toBe(42);
  });

  test("counts Hero starters only on the pitch", () => {
    const team = teamWithRarities([
      { slot: "gk", rarity: "hero" },
      { slot: "df1", rarity: "hero" },
    ]);
    team.slots.bench1 = filledAssignment(3, { rarity: "hero" });
    expect(countHeroStarters(team)).toBe(2);
    expect(isRarityAllowed(team, "df2", "hero")).toBe(false);
    expect(isRarityAllowed(team, "gk", "hero")).toBe(true); // already this slot
    expect(isRarityAllowed(team, "bench1", "hero")).toBe(true); // bench free
  });

  test("counts Basara across the whole squad", () => {
    const team = teamWithRarities([{ slot: "gk", rarity: "basara" }]);
    expect(countBasaraInSquad(team)).toBe(1);
    expect(isRarityAllowed(team, "df1", "basara")).toBe(false);
    expect(isRarityAllowed(team, "bench1", "basara")).toBe(false);
    expect(isRarityAllowed(team, "gk", "basara")).toBe(true);
  });

  test("rarityBudget flags over-cap", () => {
    const team = teamWithRarities([
      { slot: "gk", rarity: "hero" },
      { slot: "df1", rarity: "hero" },
      { slot: "df2", rarity: "hero" },
      { slot: "mf1", rarity: "basara" },
    ]);
    team.slots.bench1 = filledAssignment(9, { rarity: "basara" });
    const budget = rarityBudget(team);
    expect(budget.heroes).toBe(3);
    expect(budget.heroOver).toBe(true);
    expect(budget.basaras).toBe(2);
    expect(budget.basaraOver).toBe(true);
  });
});

describe("passive slots and tiers", () => {
  test("pitch slots 0–4 are presets, slot 5 is custom", () => {
    expect(passiveSourceFor("pitch", 0)).toBe("player");
    expect(passiveSourceFor("pitch", 4)).toBe("player");
    expect(passiveSourceFor("pitch", 5)).toBe("custom");
    expect(passiveSourceFor("coach", 0)).toBe("coach");
    expect(passiveSourceFor("manager", 5)).toBe("manager");
  });

  test("rarity maps onto dump tiers 0–4", () => {
    expect(passiveTierForRarity("common")).toBe(0);
    expect(passiveTierForRarity("legendary")).toBe(4);
    expect(passiveTierForRarity("hero")).toBe(4);
  });

  test("passiveValueForRarity picks the sibling tier", () => {
    const catalogue: Passive[] = [
      {
        id: "ps1_t0",
        number: 1,
        source: "player",
        buildType: null,
        description: "low",
        descriptions: {},
        family: 7,
        tier: 0,
        strongValue: 1,
        weakValue: 1,
        effects: [],
      },
      {
        id: "ps1_t4",
        number: 2,
        source: "player",
        buildType: null,
        description: "high",
        descriptions: {},
        family: 7,
        tier: 4,
        strongValue: 5,
        weakValue: 5,
        effects: [],
      },
    ];
    expect(passiveValueForRarity(catalogue[0]!, "common", catalogue)).toBe(1);
    expect(passiveValueForRarity(catalogue[0]!, "legendary", catalogue)).toBe(5);
  });
});
