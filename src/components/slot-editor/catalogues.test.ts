import { describe, expect, test } from "bun:test";

import type { Equipment, Passive } from "@/domain/types";
import { groupEquipmentBySlot, groupPassivesBySource } from "./catalogues";

function passive(overrides: Partial<Passive> & Pick<Passive, "id" | "number">): Passive {
  return {
    buildType: null,
    descriptions: {},
    source: "player",
    description: overrides.id,
    family: null,
    tier: null,
    strongValue: 0,
    weakValue: 0,
    effects: [],
    ...overrides,
  };
}

function equipment(
  overrides: Partial<Equipment> & Pick<Equipment, "id" | "name" | "total">,
): Equipment {
  return {
    slot: "boots",
    names: {},
    description: "",
    descriptions: {},
    shop: "",
    stats: {},
    ...overrides,
  };
}

describe("groupPassivesBySource", () => {
  test("keeps the highest tier of each family and preserves standalone passives", () => {
    const grouped = groupPassivesBySource([
      passive({ id: "tier-1", number: 20, family: 7, tier: 1 }),
      passive({ id: "standalone", number: 5 }),
      passive({ id: "tier-3", number: 21, family: 7, tier: 3 }),
      passive({ id: "tier-2", number: 19, family: 7, tier: 2 }),
    ]);

    expect(grouped.get("player")?.map(({ id }) => id)).toEqual(["standalone", "tier-3"]);
  });

  test("keeps sources separate", () => {
    const grouped = groupPassivesBySource([
      passive({ id: "player", number: 1, source: "player" }),
      passive({ id: "coach", number: 2, source: "coach" }),
    ]);

    expect(grouped.get("player")?.map(({ id }) => id)).toEqual(["player"]);
    expect(grouped.get("coach")?.map(({ id }) => id)).toEqual(["coach"]);
  });
});

describe("groupEquipmentBySlot", () => {
  test("groups items by slot and sorts strongest items first", () => {
    const grouped = groupEquipmentBySlot([
      equipment({ id: "weak", name: "Weak", total: 2 }),
      equipment({ id: "strong-z", name: "Zulu", total: 8 }),
      equipment({ id: "strong-a", name: "Alpha", total: 8 }),
      equipment({ id: "bracelet", name: "Bracelet", total: 4, slot: "bracelet" }),
    ]);

    expect(grouped.get("boots")?.map(({ id }) => id)).toEqual(["strong-a", "strong-z", "weak"]);
    expect(grouped.get("bracelet")?.map(({ id }) => id)).toEqual(["bracelet"]);
  });
});
