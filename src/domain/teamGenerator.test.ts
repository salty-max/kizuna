import { describe, expect, test } from "bun:test";

import { findFormation } from "./formations";
import { emptyBaseStats } from "./stats";
import { applyFormation, createTeam, filledAssignment, resolveTeam, type Team } from "./team";
import { generateTeamCandidates, type TeamGenerationOptions } from "./teamGenerator";
import type { Dataset, Player, Position, Role } from "./types";

function player(
  id: number,
  position: Position,
  extras: Partial<Player> = {},
  role: Role = "Player",
): Player {
  const stats = {
    ...emptyBaseStats(),
    kick: 40 + id,
    control: 35 + id,
    technique: 30 + id,
    pressure: 25 + id,
    physical: 20 + id,
    agility: 15 + id,
    intelligence: 10 + id,
  };
  return {
    id,
    name: `Player ${id}`,
    names: { en: `Player ${id}` },
    nameOriginal: `Player ${id}`,
    nickname: `P${id}`,
    image: "",
    characterId: `c-test-${id}`,
    modelStem: "",
    game: "Test",
    team: "Test",
    teamId: 1,
    teamNames: { en: "Test" },
    position,
    altPosition: null,
    element: (["Fire", "Wind", "Forest", "Mountain"] as const)[id % 4]!,
    buildType: (["justice", "counter", "tension", "bond"] as const)[id % 4]!,
    role,
    gender: "Neutral",
    spiritDrop: true,
    ageGroup: "Middle School",
    year: "1",
    stats,
    statsLv50: { ...stats },
    total: Object.values(stats).reduce((sum, value) => sum + value, 0),
    heroStats: null,
    basaraStats: null,
    skills: [],
    skillsAlt: [],
    heroSkills: null,
    basaraSkills: null,
    ...extras,
  };
}

function dataset(): Dataset {
  const players: Player[] = [];
  let id = 1;
  for (const [position, count] of [
    ["GK", 3],
    ["DF", 8],
    ["MF", 9],
    ["FW", 6],
  ] as const) {
    for (let index = 0; index < count; index++) players.push(player(id++, position));
  }
  players.push(player(id++, "MF", { buildType: "justice" }, "Coach"));
  for (let index = 0; index < 3; index++) {
    players.push(player(id++, "MF", { buildType: "tension" }, "Manager"));
  }
  return {
    players,
    passives: [],
    equipment: [],
    abilities: [],
    tactics: [],
    synergies: [],
    games: ["Test"],
    imageBase: "",
    generatedAt: "2026-08-14T00:00:00.000Z",
  };
}

const options: TeamGenerationOptions = {
  goal: "competitive",
  playstyle: "auto",
  formationId: "auto",
  allowAlternatePositions: true,
  preserveExisting: false,
};

describe("team generation", () => {
  test("returns three complete and position-safe proposals", () => {
    const data = dataset();
    const candidates = generateTeamCandidates(createTeam(), data, options);

    expect(candidates).toHaveLength(3);
    expect(new Set(candidates.map((candidate) => candidate.team.formationId)).size).toBe(3);

    for (const candidate of candidates) {
      const resolved = resolveTeam(candidate.team, data);
      expect(resolved.starters).toHaveLength(11);
      expect(resolved.starters.every((slot) => slot.positionMatch)).toBe(true);
      expect(candidate.metrics.reserveKeeper).toBe(true);

      const identities = Object.values(candidate.team.slots).flatMap((slot) => {
        const selected = data.players.find((entry) => entry.id === slot.playerId);
        return selected ? [selected.nameOriginal] : [];
      });
      expect(new Set(identities).size).toBe(identities.length);
      expect(candidate.metrics.heroStarters).toBe(0);
      expect(candidate.metrics.basaraCount).toBe(0);
    }
  });

  test("uses the real Hero and Basara forms up to the legal caps", () => {
    const data = dataset();
    for (const entry of data.players) {
      if (entry.role !== "Player") continue;
      entry.heroStats = { lv50: { ...entry.statsLv50 }, lv99: { ...entry.stats } };
      entry.basaraStats = { lv50: { ...entry.statsLv50 }, lv99: { ...entry.stats } };
    }

    const candidates = generateTeamCandidates(createTeam(), data, options);

    for (const candidate of candidates) {
      const formation = findFormation(candidate.team.formationId);
      const heroStarters = formation.slots.filter(
        (slot) => candidate.team.slots[slot.id]?.rarity === "hero",
      );
      const basaras = Object.values(candidate.team.slots).filter(
        (slot) => slot.playerId != null && slot.rarity === "basara",
      );
      expect(heroStarters).toHaveLength(2);
      expect(basaras).toHaveLength(1);
      expect(candidate.metrics.heroStarters).toBe(2);
      expect(candidate.metrics.basaraCount).toBe(1);
    }
  });

  test("never fills a missing position with an incompatible player", () => {
    const data = dataset();
    data.players = data.players.filter((entry) => entry.position !== "GK");

    const [candidate] = generateTeamCandidates(createTeam(), data, {
      ...options,
      formationId: "4-4-2-diamond",
    });

    expect(candidate?.team.slots.gk?.playerId).toBeNull();
    expect(candidate?.metrics.starters).toBe(10);
  });

  test("switches to the tournament ruleset", () => {
    const [candidate] = generateTeamCandidates(createTeam(), dataset(), {
      ...options,
      goal: "tournament",
    });

    expect(candidate?.team.rulesetId).toBe("tournament");
  });

  test("repairs preserved picks instead of keeping an out-of-position starter", () => {
    const data = dataset();
    const midfielder = data.players.find((entry) => entry.position === "MF")!;
    const team = createTeam("4-4-2-diamond");
    team.slots.gk = filledAssignment(midfielder.id);

    const [candidate] = generateTeamCandidates(team, data, {
      ...options,
      formationId: "4-4-2-diamond",
      preserveExisting: true,
    });
    const resolved = resolveTeam(candidate!.team, data);

    expect(resolved.starters).toHaveLength(11);
    expect(resolved.starters.every((slot) => slot.positionMatch)).toBe(true);
    expect(
      Object.entries(candidate!.team.slots).find(
        ([, slot]) => slot.playerId === midfielder.id,
      )?.[0],
    ).not.toBe("gk");
  });

  test("removes preserved character variants duplicated across the roster", () => {
    const data = dataset();
    const original = data.players.find((entry) => entry.position === "DF")!;
    const variant = player(99, "DF", { nameOriginal: original.nameOriginal });
    data.players.push(variant);
    const team = createTeam("4-4-2-diamond");
    team.slots.df1 = filledAssignment(original.id);
    team.slots.bench1 = filledAssignment(variant.id);

    const [candidate] = generateTeamCandidates(team, data, {
      ...options,
      formationId: "4-4-2-diamond",
      preserveExisting: true,
    });
    const identities = Object.values(candidate!.team.slots).flatMap((slot) => {
      const selected = data.players.find((entry) => entry.id === slot.playerId);
      return selected ? [selected.nameOriginal] : [];
    });

    expect(new Set(identities).size).toBe(identities.length);
  });
});

describe("position invariants", () => {
  test("an official alternate position is valid", () => {
    const data = dataset();
    const alternate = player(99, "MF", { altPosition: "DF" });
    data.players.push(alternate);
    const team = createTeam();
    team.slots.df1 = filledAssignment(alternate.id);

    const slot = resolveTeam(team, data).slots.find((entry) => entry.slotId === "df1");
    expect(slot?.positionMatch).toBe(true);
  });

  test("a removed formation slot is reassigned to a compatible post", () => {
    const data = dataset();
    const striker = data.players.find((entry) => entry.position === "FW")!;
    const team: Team = createTeam("4-3-3-triangle");
    team.slots.fw3 = filledAssignment(striker.id);

    const changed = applyFormation(team, "4-4-2-diamond", data.players);
    const formation = findFormation(changed.formationId);
    const assigned = formation.slots.find(
      (slot) => changed.slots[slot.id]?.playerId === striker.id,
    );

    expect(assigned?.position).toBe("FW");
  });
});
