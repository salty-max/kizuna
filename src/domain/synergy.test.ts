import { describe, expect, test } from "bun:test";

import { findFormation } from "./formations";
import { computePower } from "./stats";
import { computeSynergy, squadShape } from "./synergy";
import { createTeam, resolveTeam, type Team } from "./team";
import {
  BUILD_TYPES,
  heroVariantFor,
  type BuildType,
  type Dataset,
  type Element,
  type Equipment,
  type Passive,
  type PassiveEffect,
  type Player,
  type Position,
} from "./types";

/* ── Fixtures ─────────────────────────────────────────────────────────────── */

function player(
  id: number,
  position: Position,
  element: Element,
  buildType: BuildType | null = null,
): Player {
  const stats = {
    kick: 100,
    control: 100,
    technique: 100,
    pressure: 100,
    physical: 100,
    agility: 100,
    intelligence: 100,
  };
  return {
    id,
    name: `P${id}`,
    nameOriginal: `P${id}`,
    nickname: `P${id}`,
    image: "x.png",
    characterId: `c-test-${id}`,
    modelStem: "",
    game: "Test",
    names: {},
    team: "",
    teamId: null,
    teamNames: {},
    position,
    altPosition: null,
    element,
    buildType,
    role: "Player",
    gender: "Male",
    spiritDrop: false,
    ageGroup: "Middle School",
    year: "-",
    stats,
    statsLv50: { ...stats },
    total: 700,
    heroStats: null,
    basaraStats: null,
    skills: [],
    skillsAlt: [],
    heroSkills: null,
    basaraSkills: null,
  };
}

function passive(
  id: string,
  effects: PassiveEffect[],
  source: Passive["source"] = "player",
): Passive {
  return {
    id,
    number: 1,
    source,
    buildType: null,
    description: id,
    descriptions: {},
    family: null,
    tier: null,
    strongValue: 10,
    weakValue: 5,
    effects,
  };
}

function effect(
  partial: Partial<Extract<PassiveEffect, { mode: "percent" }>> = {},
): Extract<PassiveEffect, { mode: "percent" }> {
  return {
    mode: "percent",
    scope: "team",
    stat: "shotAT",
    direction: "increase",
    conditions: [],
    ...partial,
  };
}

const boots: Equipment = {
  id: "eq_sh_test",
  slot: "boots",
  name: "Test Boots",
  names: { en: "Test Boots" },
  description: "",
  descriptions: {},
  shop: "Test",
  stats: { kick: 10, agility: 6 },
  total: 16,
};

const dataset: Dataset = {
  players: [
    player(1, "GK", "Fire"),
    player(2, "DF", "Fire"),
    player(3, "DF", "Wind"),
    player(4, "MF", "Wind"),
    player(5, "FW", "Forest"),
    player(6, "GK", "Fire", "justice"),
  ],
  passives: [
    passive("teamShot", [effect({ scope: "team", stat: "shotAT" })]),
    passive("selfShot", [effect({ scope: "self", stat: "shotAT" })]),
    passive("sameElement", [effect({ scope: "alliesSameElement", stat: "shotAT" })]),
    passive("diffElement", [effect({ scope: "alliesDifferentElement", stat: "shotAT" })]),
    passive("gkOnly", [effect({ scope: "alliedGK", stat: "wallDF" })]),
    passive("teamDown", [effect({ scope: "team", stat: "shotAT", direction: "decrease" })]),
    passive("conditional", [
      effect({ scope: "team", stat: "shotAT", conditions: ["tensionAt100"] }),
    ]),
    passive("fullTensionShot", [
      effect({ scope: "team", stat: "shotAT", conditions: ["tensionAt100"] }),
    ]),
    passive("allPower", [effect({ scope: "team", stat: "all" })]),
    passive("justiceRank", [
      effect({
        scope: "team",
        stat: "all",
        conditions: ["perBuildChargeRank"],
        requiredBuildType: "justice",
      }),
    ]),
    passive("breachGauge", [effect({ scope: "team", stat: "breachRate" })]),
    passive("foulDown", [effect({ scope: "team", stat: "foulRate", direction: "decrease" })]),
    passive("tacticCooldown", [
      effect({ scope: "self", stat: "tacticCooldown", direction: "decrease" }),
    ]),
    passive("nearby", [effect({ scope: "nearbyAllies", stat: "focus" })]),
    passive("subbed", [effect({ scope: "subbedOnPlayer", stat: "shotAT" })]),
    passive("coachTeam", [effect({ scope: "team", stat: "shotAT" })], "coach"),
  ],
  equipment: [boots],
  abilities: [],
  tactics: [],
  synergies: [],
  games: ["Test"],
  imageBase: "",
  generatedAt: "2026-01-01T00:00:00.000Z",
};

const formation = findFormation("4-4-2-diamond");

/** Fills pitch slots in order with the given player ids. */
function teamWith(playerIds: number[], mutate?: (team: Team) => void): Team {
  const team = createTeam(formation.id);
  formation.slots.forEach((slot, index) => {
    const id = playerIds[index];
    if (id !== undefined) team.slots[slot.id]!.playerId = id;
  });
  mutate?.(team);
  return team;
}

function givePassive(team: Team, slotId: string, passiveId: string, value: number, index = 0) {
  team.slots[slotId]!.passives[index] = { passiveId, value };
}

function analyse(team: Team) {
  return computeSynergy(resolveTeam(team, dataset));
}

/* ── Base stats and power ─────────────────────────────────────────────────── */

describe("power stats", () => {
  test("derives from the documented formulas", () => {
    const power = computePower({
      kick: 90,
      control: 97,
      technique: 91,
      pressure: 98,
      physical: 105,
      agility: 111,
      intelligence: 97,
    });

    expect(power.shootAT).toBe(187); // 90 + 97
    expect(power.focusAT).toBe(233); // 91 + 97 + 45
    expect(power.focusDF).toBe(244); // 91 + 97 + 55.5 → 243.5 rounds to 244
    expect(power.wallDF).toBe(203); // 98 + 105
    expect(power.scrambleAT).toBe(202); // 97 + 105
    expect(power.scrambleDF).toBe(195); // 97 + 98
    expect(power.kp).toBe(955); // 196 + 315 + 444
  });

  test("equipment raises base stats before power is derived", () => {
    const team = teamWith([1]);
    team.slots.gk!.equipment.boots = boots.id;

    const slot = resolveTeam(team, dataset).slots.find((s) => s.slotId === "gk")!;

    expect(slot.stats.kick).toBe(110);
    expect(slot.stats.agility).toBe(106);
    expect(slot.total).toBe(716);
    expect(slot.power.shootAT).toBe(210); // 110 + 100
  });
});

describe("rarity", () => {
  const resolveGk = (mutate: (team: Team) => void) => {
    const team = teamWith([1]);
    mutate(team);
    return resolveTeam(team, dataset).slots.find((s) => s.slotId === "gk")!;
  };

  test("scales every base stat by the tier's multiplier", () => {
    const slot = resolveGk((team) => {
      team.slots.gk!.rarity = "legendary";
    });

    // Fixture stats are all 100, so ×1.4 is directly readable.
    expect(slot.scaledStats.kick).toBe(140);
    expect(slot.stats.kick).toBe(140);
    expect(slot.total).toBe(980);
    expect(slot.power.shootAT).toBe(280);
  });

  test("Common leaves the dataset line untouched", () => {
    const slot = resolveGk(() => {});

    expect(slot.rarity).toBe("common");
    expect(slot.scaledStats).toEqual(dataset.players[0]!.stats);
  });

  test("Hero and Basara fall back to measured ratios when no real table exists", () => {
    const hero = resolveGk((team) => {
      team.slots.gk!.rarity = "hero";
    });
    const basara = resolveGk((team) => {
      team.slots.gk!.rarity = "basara";
    });

    // Fixture players have no heroStats/basaraStats, so the ratio estimate applies.
    expect(hero.scaledStats.kick).toBe(121); // 100 × 1.206
    expect(basara.scaledStats.kick).toBe(144); // 100 × 1.444
  });

  test("real Hero and Basara tables beat the ratio estimate", () => {
    const withTables: Player = {
      ...dataset.players[0]!,
      heroStats: {
        lv50: { ...dataset.players[0]!.stats, kick: 150 },
        lv99: { ...dataset.players[0]!.stats, kick: 173 },
      },
      basaraStats: {
        lv50: { ...dataset.players[0]!.stats, kick: 180 },
        lv99: { ...dataset.players[0]!.stats, kick: 207 },
      },
    };
    const local: Dataset = { ...dataset, players: [withTables, ...dataset.players.slice(1)] };

    const hero = resolveTeam(
      teamWith([1], (team) => {
        team.slots.gk!.rarity = "hero";
      }),
      local,
    ).slots.find((s) => s.slotId === "gk")!;
    const basara = resolveTeam(
      teamWith([1], (team) => {
        team.slots.gk!.rarity = "basara";
      }),
      local,
    ).slots.find((s) => s.slotId === "gk")!;

    expect(hero.scaledStats.kick).toBe(173);
    expect(basara.scaledStats.kick).toBe(207);
  });

  test("equipment is added after the multiplier, never scaled by it", () => {
    const slot = resolveGk((team) => {
      team.slots.gk!.rarity = "legendary";
      team.slots.gk!.equipment.boots = boots.id;
    });

    // 100×1.4 = 140, then a flat +10 — not (100+10)×1.4 = 154.
    expect(slot.stats.kick).toBe(150);
    expect(slot.scaledStats.kick).toBe(140);
  });

  test("passive percentages apply on top of the rarity-scaled power", () => {
    const team = teamWith([1]);
    team.slots.gk!.rarity = "legendary";
    givePassive(team, "gk", "selfShot", 10);

    const result = analyse(team);

    // shootAT 280 (140+140), then +10%.
    expect(result.effective.get("gk")!.shootAT).toBe(308);
  });
});

describe("archetype", () => {
  const resolveGk = (mutate: (team: Team) => void) => {
    const team = teamWith([6]); // fixture player with buildType "justice"
    mutate(team);
    return resolveTeam(team, dataset).slots.find((s) => s.slotId === "gk")!;
  };

  test("falls back to the dataset entry's value", () => {
    expect(resolveGk(() => {}).buildType).toBe("justice");
  });

  test("can be overridden per slot — the same character drops with different ones", () => {
    const slot = resolveGk((team) => {
      team.slots.gk!.buildType = "roughPlay";
    });

    expect(slot.buildType).toBe("roughPlay");
    // The dataset entry is untouched; only this slot's reading of it changed.
    expect(dataset.players.find((p) => p.id === 6)!.buildType).toBe("justice");
  });

  test("drives the Hero variant, so an override recolours the slot", () => {
    expect(heroVariantFor(resolveGk(() => {}).buildType)).toBe("silver");

    const overridden = resolveGk((team) => {
      team.slots.gk!.buildType = "breach";
    });
    expect(heroVariantFor(overridden.buildType)).toBe("pink");
  });

  test("can supply an archetype the dataset leaves blank", () => {
    const team = teamWith([1]); // fixture player with buildType null
    team.slots.gk!.buildType = "counter";

    const slot = resolveTeam(team, dataset).slots.find((s) => s.slotId === "gk")!;

    expect(slot.player!.buildType).toBeNull();
    expect(slot.buildType).toBe("counter");
  });

  test("is counted from the effective value in the squad breakdown", () => {
    const team = teamWith([6, 6]);
    team.slots.df1!.buildType = "tension";

    const shape = squadShape(resolveTeam(team, dataset));

    expect(shape.buildTypes).toEqual([
      { buildType: "justice", count: 1 },
      { buildType: "tension", count: 1 },
    ]);
  });
});

describe("hero variants", () => {
  test("follow the character's archetype", () => {
    expect(heroVariantFor("tension")).toBe("red");
    expect(heroVariantFor("roughPlay")).toBe("red");
    expect(heroVariantFor("justice")).toBe("silver");
    expect(heroVariantFor("bond")).toBe("silver");
    expect(heroVariantFor("breach")).toBe("pink");
    expect(heroVariantFor("counter")).toBe("pink");
  });

  test("are undetermined when the archetype is missing", () => {
    expect(heroVariantFor(null)).toBeNull();
  });

  test("cover every archetype, so no build is left without a Hero colour", () => {
    for (const buildType of BUILD_TYPES) {
      expect(heroVariantFor(buildType)).not.toBeNull();
    }
  });
});

describe("squad limits", () => {
  const shapeOf = (mutate: (team: Team) => void) => {
    const team = teamWith([1, 2, 3, 4, 5]);
    mutate(team);
    return squadShape(resolveTeam(team, dataset));
  };

  test("accept two Hero starters", () => {
    const shape = shapeOf((team) => {
      team.slots.gk!.rarity = "hero";
      team.slots.df1!.rarity = "hero";
    });

    expect(shape.violations).toEqual([]);
  });

  test("flag a third Hero starter", () => {
    const shape = shapeOf((team) => {
      team.slots.gk!.rarity = "hero";
      team.slots.df1!.rarity = "hero";
      team.slots.df2!.rarity = "hero";
    });

    expect(shape.violations).toHaveLength(1);
    expect(shape.violations[0]).toEqual({ code: "heroLimit", count: 3, max: 2 });
  });

  test("count Hero on the pitch only — the bench does not count", () => {
    const shape = shapeOf((team) => {
      team.slots.gk!.rarity = "hero";
      team.slots.df1!.rarity = "hero";
      team.slots.bench1!.playerId = 4;
      team.slots.bench1!.rarity = "hero";
    });

    expect(shape.violations).toEqual([]);
  });

  test("flag a second Basara even when one of them is benched", () => {
    const shape = shapeOf((team) => {
      team.slots.gk!.rarity = "basara";
      team.slots.bench1!.playerId = 4;
      team.slots.bench1!.rarity = "basara";
    });

    expect(shape.violations).toHaveLength(1);
    expect(shape.violations[0]).toEqual({ code: "basaraLimit", count: 2, max: 1 });
  });

  test("ignore rarity on an empty slot", () => {
    const shape = shapeOf((team) => {
      team.slots.bench1!.rarity = "basara";
      team.slots.bench2!.rarity = "basara";
    });

    expect(shape.violations).toEqual([]);
  });

  test("report the rarity spread of the starting eleven", () => {
    const shape = shapeOf((team) => {
      team.slots.gk!.rarity = "legendary";
      team.slots.df1!.rarity = "legendary";
    });

    expect(shape.rarities).toEqual([
      { rarity: "common", count: 3 },
      { rarity: "legendary", count: 2 },
    ]);
  });
});

describe("rulesets", () => {
  const duplicate: Player = {
    ...player(7, "MF", "Mountain"),
    name: "P1 variant",
    nameOriginal: "P1",
  };
  const local: Dataset = { ...dataset, players: [...dataset.players, duplicate] };

  test("standard play allows distinct database variants of one character", () => {
    const team = teamWith([1]);
    team.slots.bench1!.playerId = duplicate.id;

    expect(squadShape(resolveTeam(team, local)).violations).toEqual([]);
  });

  test("tournament play rejects duplicate character identities", () => {
    const team = teamWith([1]);
    team.rulesetId = "tournament";
    team.slots.bench1!.playerId = duplicate.id;

    const shape = squadShape(resolveTeam(team, local));

    expect(shape.violations).toContainEqual({
      code: "duplicateCharacter",
      count: 2,
      max: 1,
      name: "P1",
    });
    expect(shape.notices).toEqual([{ code: "seasonalNotModelled", required: 5 }]);
  });

  test("tournament power uses the level-50 stat tables", () => {
    const ranked = player(8, "FW", "Fire");
    ranked.statsLv50 = {
      kick: 50,
      control: 50,
      technique: 50,
      pressure: 50,
      physical: 50,
      agility: 50,
      intelligence: 50,
    };
    ranked.heroStats = {
      lv50: { ...ranked.statsLv50, kick: 75 },
      lv99: { ...ranked.stats, kick: 175 },
    };
    const levelDataset = { ...dataset, players: [...dataset.players, ranked] };
    const standard = teamWith([ranked.id]);
    const tournament = teamWith([ranked.id]);
    tournament.rulesetId = "tournament";

    expect(resolveTeam(standard, levelDataset).starters[0]!.scaledStats.kick).toBe(100);
    expect(resolveTeam(tournament, levelDataset).starters[0]!.scaledStats.kick).toBe(50);

    standard.slots.gk!.rarity = "hero";
    tournament.slots.gk!.rarity = "hero";
    expect(resolveTeam(standard, levelDataset).starters[0]!.scaledStats.kick).toBe(175);
    expect(resolveTeam(tournament, levelDataset).starters[0]!.scaledStats.kick).toBe(75);
  });
});

/* ── Scope resolution ─────────────────────────────────────────────────────── */

describe("scopes", () => {
  test("team reaches every starter", () => {
    const team = teamWith([1, 2, 3]);
    givePassive(team, "gk", "teamShot", 10);

    const result = analyse(team);

    for (const slotId of ["gk", "df1", "df2"]) {
      expect(result.power.get(slotId)!.shootAT.guaranteed).toBe(10);
    }
  });

  test("self reaches only the carrier", () => {
    const team = teamWith([1, 2]);
    givePassive(team, "gk", "selfShot", 10);

    const result = analyse(team);

    expect(result.power.get("gk")!.shootAT.guaranteed).toBe(10);
    expect(result.power.get("df1")!.shootAT.guaranteed).toBe(0);
  });

  test("alliesSameElement covers the carrier and matching allies only", () => {
    // gk=Fire, df1=Fire, df2=Wind
    const team = teamWith([1, 2, 3]);
    givePassive(team, "gk", "sameElement", 10);

    const result = analyse(team);

    expect(result.power.get("gk")!.shootAT.guaranteed).toBe(10);
    expect(result.power.get("df1")!.shootAT.guaranteed).toBe(10);
    expect(result.power.get("df2")!.shootAT.guaranteed).toBe(0);
  });

  test("alliesDifferentElement excludes the carrier", () => {
    const team = teamWith([1, 2, 3]);
    givePassive(team, "gk", "diffElement", 10);

    const result = analyse(team);

    expect(result.power.get("gk")!.shootAT.guaranteed).toBe(0);
    expect(result.power.get("df1")!.shootAT.guaranteed).toBe(0);
    expect(result.power.get("df2")!.shootAT.guaranteed).toBe(10);
  });

  test("position scopes select by the target's position, not the carrier's", () => {
    const team = teamWith([1, 2, 3]);
    givePassive(team, "df1", "gkOnly", 12);

    const result = analyse(team);

    expect(result.power.get("gk")!.wallDF.guaranteed).toBe(12);
    expect(result.power.get("df1")!.wallDF.guaranteed).toBe(0);
  });

  test("nearbyAllies never counts as guaranteed", () => {
    const team = teamWith([1, 2]);
    givePassive(team, "gk", "nearby", 8);

    const result = analyse(team);
    const focusAT = result.power.get("gk")!.focusAT;

    expect(focusAT.guaranteed).toBe(0);
    expect(focusAT.conditional).toBe(8);
    expect(focusAT.contributions[0]!.note).toBeDefined();
  });

  test("subbedOnPlayer is reported as unresolved rather than dropped", () => {
    const team = teamWith([1, 2]);
    givePassive(team, "gk", "subbed", 10);

    const result = analyse(team);

    expect(result.unresolved).toHaveLength(1);
    expect(result.unresolved[0]!.passiveId).toBe("subbed");
    expect(result.power.get("gk")!.shootAT.guaranteed).toBe(0);
  });

  test("an element scope on a coach slot cannot resolve and says so", () => {
    const team = teamWith([1, 2]);
    givePassive(team, "coach", "sameElement", 10);

    const result = analyse(team);

    expect(result.unresolved).toHaveLength(1);
    expect(result.unresolved[0]!.reason).toBe("elementScopeNoPlayer");
  });
});

/* ── Stacking, direction, buckets ─────────────────────────────────────────── */

describe("aggregation", () => {
  test("percentages stack additively across carriers", () => {
    const team = teamWith([1, 2, 3]);
    givePassive(team, "gk", "teamShot", 10);
    givePassive(team, "df1", "teamShot", 15);

    const result = analyse(team);

    expect(result.power.get("gk")!.shootAT.guaranteed).toBe(25);
  });

  test("several passives on one slot all count", () => {
    const team = teamWith([1, 2]);
    givePassive(team, "gk", "teamShot", 10, 0);
    givePassive(team, "gk", "selfShot", 5, 1);

    const result = analyse(team);

    expect(result.power.get("gk")!.shootAT.guaranteed).toBe(15);
    expect(result.power.get("df1")!.shootAT.guaranteed).toBe(10);
  });

  test("a decrease contributes a negative percentage", () => {
    const team = teamWith([1, 2]);
    givePassive(team, "gk", "teamShot", 20, 0);
    givePassive(team, "gk", "teamDown", 5, 1);

    const result = analyse(team);

    expect(result.power.get("gk")!.shootAT.guaranteed).toBe(15);
  });

  test("conditional effects stay out of the guaranteed bucket", () => {
    const team = teamWith([1, 2]);
    givePassive(team, "gk", "teamShot", 10, 0);
    givePassive(team, "gk", "conditional", 30, 1);

    const result = analyse(team);
    const shootAT = result.power.get("gk")!.shootAT;

    expect(shootAT.guaranteed).toBe(10);
    expect(shootAT.conditional).toBe(30);
    expect(result.effective.get("gk")!.shootAT).toBe(220); // 200 × 1.10
    expect(result.potential.get("gk")!.shootAT).toBe(280); // 200 × 1.40
  });

  test("Build Rank scales only passives matching the simulated Team Build", () => {
    const team = teamWith([1], (draft) => {
      draft.teamBuildType = "justice";
      draft.buildRank = 4;
    });
    givePassive(team, "gk", "justiceRank", 2);

    const matching = analyse(team).power.get("gk")!.shootAT;
    expect(matching.guaranteed).toBe(0);
    expect(matching.conditional).toBe(8);

    team.teamBuildType = "tension";
    expect(analyse(team).power.get("gk")!.shootAT.conditional).toBe(0);
  });

  test("`all` spreads over every power stat except KP", () => {
    const team = teamWith([1]);
    givePassive(team, "gk", "allPower", 10);

    const modifiers = analyse(team).power.get("gk")!;

    for (const key of [
      "shootAT",
      "focusAT",
      "focusDF",
      "wallDF",
      "scrambleAT",
      "scrambleDF",
    ] as const) {
      expect(modifiers[key].guaranteed).toBe(10);
    }
    expect(modifiers.kp.guaranteed).toBe(0);
  });

  test("a passive with zero value is ignored", () => {
    const team = teamWith([1, 2]);
    givePassive(team, "gk", "teamShot", 0);

    expect(analyse(team).power.get("gk")!.shootAT.contributions).toHaveLength(0);
  });

  test("bench passives do not apply to the starting eleven", () => {
    const team = teamWith([1, 2]);
    team.slots.bench1!.playerId = 3;
    givePassive(team, "bench1", "teamShot", 10);

    expect(analyse(team).power.get("gk")!.shootAT.guaranteed).toBe(0);
  });

  test("coach passives do apply", () => {
    const team = teamWith([1, 2]);
    givePassive(team, "coach", "coachTeam", 25);

    expect(analyse(team).power.get("gk")!.shootAT.guaranteed).toBe(25);
  });
});

/* ── Gauges ───────────────────────────────────────────────────────────────── */

describe("gauges", () => {
  test("count once for the team, not once per player reached", () => {
    const team = teamWith([1, 2, 3, 4, 5]);
    givePassive(team, "gk", "breachGauge", 6);

    const result = analyse(team);

    expect(result.gauges.breachRate!.guaranteed).toBe(6);
    expect(result.gauges.breachRate!.contributions).toHaveLength(1);
  });

  test("a decrease on a gauge keeps its sign", () => {
    const team = teamWith([1, 2]);
    givePassive(team, "gk", "foulDown", 10);

    expect(analyse(team).gauges.foulRate!.guaranteed).toBe(-10);
  });

  test("gauges never leak into power stats", () => {
    const team = teamWith([1, 2]);
    givePassive(team, "gk", "breachGauge", 6);

    const modifiers = analyse(team).power.get("gk")!;

    expect(modifiers.shootAT.guaranteed).toBe(0);
    expect(modifiers.kp.guaranteed).toBe(0);
  });

  test("official negative caps stop accumulated cooldown reduction", () => {
    const team = teamWith([1, 2]);
    givePassive(team, "gk", "tacticCooldown", 30);
    givePassive(team, "df1", "tacticCooldown", 30);

    const modifier = analyse(team).gauges.tacticCooldown!;

    expect(modifier.rawGuaranteed).toBe(-60);
    expect(modifier.guaranteed).toBe(-50);
    expect(modifier.caps).toEqual([
      {
        id: "tacticCooldown",
        limit: -50,
        raw: -60,
        applied: -50,
        certainty: "always",
      },
    ]);
  });
});

describe("official passive caps", () => {
  test("caps the full-tension shot family before calculating potential power", () => {
    const team = teamWith([1, 2, 3]);
    givePassive(team, "gk", "fullTensionShot", 100);
    givePassive(team, "df1", "fullTensionShot", 100);
    givePassive(team, "df2", "fullTensionShot", 100);

    const result = analyse(team);
    const modifier = result.power.get("gk")!.shootAT;

    expect(modifier.rawConditional).toBe(300);
    expect(modifier.conditional).toBe(200);
    expect(modifier.caps[0]).toMatchObject({ id: "fullTensionShot", raw: 300, applied: 200 });
    expect(result.potential.get("gk")!.shootAT).toBe(600);
  });
});

/* ── Traceability ─────────────────────────────────────────────────────────── */

describe("contributions", () => {
  test("name the passive and the slot it came from", () => {
    const team = teamWith([1, 2]);
    givePassive(team, "df1", "teamShot", 10);

    const [contribution] = analyse(team).power.get("gk")!.shootAT.contributions;

    expect(contribution).toMatchObject({
      passiveId: "teamShot",
      fromSlotId: "df1",
      fromPlayerName: "P2",
      percent: 10,
      certainty: "always",
    });
  });

  test("carry the conditions that gate them", () => {
    const team = teamWith([1]);
    givePassive(team, "gk", "conditional", 30);

    const [contribution] = analyse(team).power.get("gk")!.shootAT.contributions;

    expect(contribution!.conditions).toEqual(["tensionAt100"]);
    expect(contribution!.certainty).toBe("conditional");
  });
});

/* ── Totals ───────────────────────────────────────────────────────────────── */

describe("totals", () => {
  test("sum only the starters that hold a player", () => {
    const team = teamWith([1, 2, 3]);

    const result = analyse(team);

    // Three identical fixtures at 200 shootAT each, no passives.
    expect(result.totals.effective.shootAT).toBe(600);
    expect(result.totals.potential.shootAT).toBe(600);
  });
});
