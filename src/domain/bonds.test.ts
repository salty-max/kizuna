import { describe, expect, test } from "bun:test";

import { detectBonds } from "./bonds";
import type { BondSynergy } from "./types";
import type { ResolvedSlot, ResolvedTeam } from "./team";

/** Minimal roster stub — detectBonds only reads `slots[].player?.id`. */
function mockResolved(playerIds: number[]): ResolvedTeam {
  const slots = playerIds.map(
    (id, i): ResolvedSlot =>
      ({
        slotId: `s${i}`,
        kind: "pitch",
        expectedPosition: null,
        player: { id } as ResolvedSlot["player"],
        rarity: "common",
        buildType: null,
        skills: [],
        equipment: [],
        passives: [],
        scaledStats: {} as ResolvedSlot["scaledStats"],
        stats: {} as ResolvedSlot["stats"],
        total: 0,
        power: {} as ResolvedSlot["power"],
        positionMatch: true,
      }) as ResolvedSlot,
  );

  return {
    team: { name: "", formationId: "4-4-2-diamond", tacticIds: [], slots: {} },
    formation: { id: "4-4-2-diamond", name: "4-4-2 Diamond", slots: [] },
    slots,
    starters: slots,
  };
}

const CATALOGUE: BondSynergy[] = [
  {
    id: "sf01000010",
    name: "Prince des neiges",
    names: { fr: "Prince des neiges" },
    description: "",
    descriptions: {},
    members: [1, 10],
    memberNames: ["Mark Evans", "Axel Blaze"],
  },
  {
    id: "trio",
    name: "Trio",
    names: { en: "Trio" },
    description: "",
    descriptions: {},
    members: [1, 2, 3],
    memberNames: ["A", "B", "C"],
  },
  {
    id: "unrelated",
    name: "Unrelated",
    names: { en: "Unrelated" },
    description: "",
    descriptions: {},
    members: [99, 100],
    memberNames: ["X", "Y"],
  },
];

describe("detectBonds", () => {
  test("marks a bond active when every member is rostered", () => {
    const hits = detectBonds(mockResolved([1, 10, 5]), CATALOGUE);
    const prince = hits.find((h) => h.synergy.id === "sf01000010");
    expect(prince?.status).toBe("active");
    expect(prince?.missing).toEqual([]);
  });

  test("marks a bond partial when only some members are rostered", () => {
    const hits = detectBonds(mockResolved([1, 5]), CATALOGUE);
    const prince = hits.find((h) => h.synergy.id === "sf01000010");
    expect(prince?.status).toBe("partial");
    expect(prince?.present).toEqual([1]);
    expect(prince?.missing).toEqual([10]);
  });

  test("hides bonds with zero members present", () => {
    const hits = detectBonds(mockResolved([1, 10]), CATALOGUE);
    expect(hits.some((h) => h.synergy.id === "unrelated")).toBe(false);
  });

  test("orders active before partial, then by closeness", () => {
    const hits = detectBonds(mockResolved([1, 10, 2]), CATALOGUE);
    expect(hits.map((h) => h.synergy.id)).toEqual(["sf01000010", "trio"]);
    expect(hits[0]!.status).toBe("active");
    expect(hits[1]!.status).toBe("partial");
  });
});
