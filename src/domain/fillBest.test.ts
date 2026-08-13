import { describe, expect, test } from "bun:test";

import {
  countEmptyEquipment,
  countEmptyPassives,
  countEmptySlots,
  equipmentFillScore,
  fillBestEmptyEquipment,
  fillBestEmptySlots,
  fillBestEquipment,
  fillBestPassives,
  optimizeEmptySlots,
  passiveFillScore,
  playerSlotScore,
  positionPowerScore,
} from "./fillBest";
import { createTeam, emptyAssignment, filledAssignment } from "./team";
import type { Dataset, Equipment, Passive, Player } from "./types";
import { emptyBaseStats, computePower } from "./stats";

function player(
  id: number,
  position: Player["position"],
  stats: Partial<Player["stats"]>,
  extras: Partial<Player> = {},
): Player {
  const base = emptyBaseStats();
  Object.assign(base, stats);
  return {
    id,
    name: `P${id}`,
    names: { en: `P${id}`, fr: `P${id}`, ja: `P${id}` },
    nameOriginal: `P${id}`,
    nickname: `P${id}`,
    image: "x.png",
    game: "Test",
    team: "T",
    teamId: null,
    teamNames: {},
    position,
    altPosition: null,
    element: "Fire",
    buildType: "breach",
    role: "Player",
    gender: "Male",
    spiritDrop: false,
    ageGroup: "Middle School",
    year: "-",
    stats: base,
    statsLv50: { ...base },
    total: Object.values(base).reduce((a, b) => a + b, 0),
    heroStats: null,
    basaraStats: null,
    skills: [],
    skillsAlt: [],
    heroSkills: null,
    basaraSkills: null,
    ...extras,
  };
}

function passive(
  id: string,
  source: Passive["source"],
  strongValue: number,
  effects: Passive["effects"],
  extras: Partial<Passive> = {},
): Passive {
  return {
    id,
    number: Number(id.replace(/\D/g, "")) || 1,
    source,
    buildType: extras.buildType ?? null,
    description: id,
    descriptions: { en: id, fr: id, ja: id },
    family: extras.family ?? null,
    tier: extras.tier ?? null,
    strongValue,
    weakValue: strongValue,
    effects,
    ...extras,
  };
}

function gear(
  id: string,
  slot: Equipment["slot"],
  stats: Equipment["stats"],
  total: number,
): Equipment {
  return {
    id,
    slot,
    name: id,
    names: { en: id },
    description: "",
    descriptions: {},
    shop: "",
    stats,
    total,
  };
}

function tinyDataset(
  players: Player[],
  passives: Passive[] = [],
  equipment: Equipment[] = [],
): Dataset {
  return {
    players,
    passives,
    equipment,
    abilities: [],
    tactics: [],
    synergies: [],
    games: ["Test"],
    imageBase: "",
    generatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("positionPowerScore", () => {
  test("weights FW toward shoot AT", () => {
    const shooter = computePower({
      kick: 100,
      control: 100,
      technique: 10,
      pressure: 10,
      physical: 10,
      agility: 10,
      intelligence: 10,
    });
    const wall = computePower({
      kick: 10,
      control: 10,
      technique: 10,
      pressure: 100,
      physical: 100,
      agility: 10,
      intelligence: 10,
    });
    expect(positionPowerScore(shooter, "FW")).toBeGreaterThan(positionPowerScore(wall, "FW"));
    expect(positionPowerScore(wall, "DF")).toBeGreaterThan(positionPowerScore(shooter, "DF"));
  });
});

describe("fillBestEmptySlots", () => {
  const fw = player(1, "FW", { kick: 90, control: 90 });
  const df = player(2, "DF", { pressure: 90, physical: 90 });
  const gk = player(3, "GK", { pressure: 95, physical: 95, agility: 80 });
  const mf = player(4, "MF", { technique: 90, intelligence: 90 });
  // Weaker FW — should lose the FW race to #1
  const weakFw = player(5, "FW", { kick: 40, control: 40 });

  const dataset = tinyDataset([weakFw, fw, df, gk, mf]);

  test("fills empty pitch by position and skips occupied slots", () => {
    const team = createTeam("4-4-2-diamond");
    team.slots.gk = filledAssignment(99, { rarity: "legendary" });
    // id 99 not in dataset — still "occupied"
    const next = fillBestEmptySlots(team, dataset, { includeStaff: false });

    expect(next.slots.gk?.playerId).toBe(99);
    expect(next.slots.fw1?.playerId).toBe(1);
    expect(next.slots.df1?.playerId).toBe(2);
    expect(next.slots.mf1?.playerId).toBe(4);
    // Second FW takes the remaining FW
    expect(next.slots.fw2?.playerId).toBe(5);
    expect(countEmptySlots(next)).toBeLessThan(countEmptySlots(team));
  });

  test("never duplicates a player id", () => {
    const team = createTeam("4-4-2-diamond");
    const next = fillBestEmptySlots(team, dataset, { includeStaff: false });
    const ids = Object.values(next.slots)
      .map((s) => s.playerId)
      .filter((id): id is number => id != null);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("assigns Legendary by default", () => {
    const team = createTeam("4-4-2-diamond");
    const next = fillBestEmptySlots(team, dataset, { includeStaff: false });
    expect(next.slots.fw1?.rarity).toBe("legendary");
  });

  test("avoids duplicate characters across database variants", () => {
    const original = player(10, "FW", { kick: 100 }, { nameOriginal: "Same Hero" });
    const variant = player(11, "FW", { kick: 999 }, { nameOriginal: "Same Hero" });
    const alternative = player(12, "FW", { kick: 90 }, { nameOriginal: "Other Hero" });
    const team = createTeam();
    team.slots.fw1!.playerId = original.id;

    const filled = fillBestEmptySlots(team, tinyDataset([original, variant, alternative]), {
      includeStaff: false,
    });

    expect(Object.values(filled.slots).some((slot) => slot.playerId === variant.id)).toBe(false);
    expect(Object.values(filled.slots).some((slot) => slot.playerId === alternative.id)).toBe(true);
  });

  test("prioritises members of an equipped synergy", () => {
    const required = player(20, "GK", { pressure: 20, physical: 20 });
    const stronger = player(21, "GK", { pressure: 100, physical: 100 });
    const data = tinyDataset([required, stronger]);
    data.synergies = [
      {
        id: "sf-test",
        kind: "offensive",
        name: "Test",
        names: { en: "Test" },
        description: "",
        descriptions: {},
        members: [required.id],
        memberNames: [required.name],
      },
    ];
    const team = createTeam();
    team.offensiveSynergyId = "sf-test";

    const filled = fillBestEmptySlots(team, data, { includeStaff: false });
    expect(filled.slots.gk!.playerId).toBe(required.id);
  });

  test("reports the constraints behind each selection", () => {
    const required = player(40, "GK", { pressure: 20 }, { buildType: "justice" });
    const data = tinyDataset([required]);
    data.synergies = [
      {
        id: "sf-report",
        kind: "offensive",
        name: "Report",
        names: { en: "Report" },
        description: "",
        descriptions: {},
        members: [required.id],
        memberNames: [required.name],
      },
    ];
    const team = createTeam();
    team.teamBuildType = "justice";
    team.offensiveSynergyId = "sf-report";

    const { report } = optimizeEmptySlots(team, data, { includeStaff: false });
    const decision = report.decisions.find((item) => item.slotId === "gk");

    expect(decision?.playerId).toBe(required.id);
    expect(decision?.reasons).toEqual([
      "equippedSynergy",
      "teamBuild",
      "naturalPosition",
      "rolePower",
    ]);
    expect(report.rarity).toBe("legendary");
    expect(report.preservesExisting).toBe(true);
    expect(report.uniqueCharacters).toBe(true);
  });

  test("reports when a player is used outside their natural positions", () => {
    const team = createTeam();
    let occupiedId = 1000;
    for (const [slotId, assignment] of Object.entries(team.slots)) {
      if (slotId !== "gk") assignment.playerId = occupiedId++;
    }
    const emergencyKeeper = player(50, "FW", { pressure: 90, agility: 90 });

    const { report } = optimizeEmptySlots(team, tinyDataset([emergencyKeeper]), {
      includeStaff: false,
    });

    expect(report.decisions).toHaveLength(1);
    expect(report.decisions[0]?.slotId).toBe("gk");
    expect(report.decisions[0]?.reasons).toContain("fallbackPosition");
  });

  test("keeps tagged coaches/managers off the pitch when role is known", () => {
    const fieldPlayer = player(30, "FW", { kick: 70 });
    const coach = player(31, "MF", { technique: 999 }, { role: "Coach" });
    const manager = player(32, "MF", { technique: 999 }, { role: "Manager" });
    const team = createTeam();

    const filled = fillBestEmptySlots(team, tinyDataset([fieldPlayer, coach, manager]));

    const formationPlayerIds = Object.entries(filled.slots)
      .filter(([slotId]) => slotId.startsWith("gk") || /^(df|mf|fw|bench)/.test(slotId))
      .map(([, slot]) => slot.playerId);
    expect(formationPlayerIds).toContain(fieldPlayer.id);
    expect(formationPlayerIds).not.toContain(coach.id);
    expect(formationPlayerIds).not.toContain(manager.id);
    expect(filled.slots.coach!.playerId).toBe(coach.id);
    expect([filled.slots.manager1!.playerId, filled.slots.manager2!.playerId]).toContain(
      manager.id,
    );
  });

  test("fills staff even when the dump tags everyone as Player", () => {
    // Matches production data: build-data sets role Player for all catalogue rows.
    const pool = Array.from({ length: 25 }, (_, i) =>
      player(100 + i, i % 2 === 0 ? "FW" : "MF", { kick: 40 + i, technique: 30 + i }),
    );
    const filled = fillBestEmptySlots(createTeam(), tinyDataset(pool));
    expect(filled.slots.coach?.playerId).not.toBeNull();
    expect(filled.slots.manager1?.playerId).not.toBeNull();
    expect(filled.slots.manager2?.playerId).not.toBeNull();
    expect(filled.slots.manager3?.playerId).not.toBeNull();
    expect(countEmptySlots(filled)).toBe(0);
  });

  test("counts pitch, bench and staff as optimisable", () => {
    // 11 pitch + 5 bench + 1 coach + 3 managers
    expect(countEmptySlots(createTeam())).toBe(20);
  });

  test("playerSlotScore prefers natural position", () => {
    const natural = player(10, "FW", { kick: 50, control: 50 });
    const miscast = player(11, "DF", { kick: 50, control: 50 });
    expect(playerSlotScore(natural, "FW")).toBeGreaterThan(playerSlotScore(miscast, "FW"));
  });
});

describe("fillBestPassives", () => {
  const shot = passive(
    "ps1",
    "player",
    12,
    [{ scope: "self", stat: "shotAT", mode: "percent", direction: "increase", conditions: [] }],
    { family: 1, tier: 4 },
  );
  const wall = passive(
    "ps2",
    "player",
    12,
    [{ scope: "self", stat: "wallDF", mode: "percent", direction: "increase", conditions: [] }],
    { family: 2, tier: 4 },
  );
  const cond = passive(
    "ps3",
    "player",
    20,
    [
      {
        scope: "self",
        stat: "shotAT",
        mode: "percent",
        direction: "increase",
        conditions: ["tensionAt100"],
      },
    ],
    { family: 3, tier: 4 },
  );
  const custom = passive(
    "cs1",
    "custom",
    15,
    [{ scope: "self", stat: "AT", mode: "percent", direction: "increase", conditions: [] }],
    { family: 9, tier: 4 },
  );
  const lowTier = passive(
    "ps1b",
    "player",
    4,
    [{ scope: "self", stat: "shotAT", mode: "percent", direction: "increase", conditions: [] }],
    { family: 1, tier: 0 },
  );

  const dataset = tinyDataset([player(1, "FW", { kick: 50 })], [shot, wall, cond, custom, lowTier]);

  test("scores unconditional self shot higher for FW than wall or conditional", () => {
    const a = passiveFillScore(shot, "legendary", dataset.passives, "FW", null);
    const b = passiveFillScore(wall, "legendary", dataset.passives, "FW", null);
    const c = passiveFillScore(cond, "legendary", dataset.passives, "FW", null);
    expect(a).toBeGreaterThan(b);
    expect(a).toBeGreaterThan(c);
  });

  test("fills empty rows without clobbering user picks", () => {
    const assignment = filledAssignment(1, {
      passives: [
        { passiveId: "ps2", value: 12 },
        { passiveId: null, value: 0 },
        { passiveId: null, value: 0 },
        { passiveId: null, value: 0 },
        { passiveId: null, value: 0 },
        { passiveId: null, value: 0 },
      ],
    });
    const next = fillBestPassives(assignment, "pitch", "FW", dataset);
    expect(next.passives[0]?.passiveId).toBe("ps2");
    expect(next.passives.some((p, i) => i > 0 && p.passiveId === "ps1")).toBe(true);
    expect(next.passives[5]?.passiveId).toBe("cs1");
    // 3 player families + 1 custom; one row already held wall → two player rows stay empty.
    expect(countEmptyPassives(next)).toBe(2);
  });

  test("no-ops without a player", () => {
    const empty = emptyAssignment();
    expect(fillBestPassives(empty, "pitch", "FW", dataset)).toEqual(empty);
  });
});

describe("fillBestEquipment", () => {
  const bootsKick = gear("b1", "boots", { kick: 40, control: 10 }, 50);
  const bootsWall = gear("b2", "boots", { pressure: 40, physical: 40 }, 80);
  const pendant = gear("p1", "pendant", { kick: 20 }, 20);
  const bracelet = gear("r1", "bracelet", { control: 15 }, 15);
  const misc = gear("m1", "misc", { agility: 12 }, 12);

  const dataset = tinyDataset(
    [player(1, "FW", { kick: 50 })],
    [],
    [bootsKick, bootsWall, pendant, bracelet, misc],
  );

  test("weights FW toward kick boots over higher total wall boots", () => {
    expect(equipmentFillScore(bootsKick, "FW")).toBeGreaterThan(
      equipmentFillScore(bootsWall, "FW"),
    );
  });

  test("fills empty slots without clobbering existing gear", () => {
    const assignment = filledAssignment(1, {
      equipment: { boots: "b2" },
    });
    const next = fillBestEquipment(assignment, "FW", dataset);
    expect(next.equipment.boots).toBe("b2");
    expect(next.equipment.pendant).toBe("p1");
    expect(next.equipment.bracelet).toBe("r1");
    expect(next.equipment.misc).toBe("m1");
    expect(countEmptyEquipment(next)).toBe(0);
  });

  test("team fill only touches occupied slots", () => {
    const team = createTeam("4-4-2-diamond");
    team.slots.fw1 = filledAssignment(1);
    const next = fillBestEmptyEquipment(team, dataset);
    expect(next.slots.fw1?.equipment.boots).toBe("b1");
    expect(next.slots.gk?.playerId).toBeNull();
    expect(next.slots.gk?.equipment.boots).toBeUndefined();
  });
});
