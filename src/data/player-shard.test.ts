import { describe, expect, test } from "bun:test";

import type { Player } from "@/domain/types";
import { decodePlayerShard, encodePlayerShard } from "./player-shard";

const stats = {
  kick: 101,
  control: 102,
  technique: 103,
  pressure: 104,
  physical: 105,
  agility: 106,
  intelligence: 107,
};

function player(id: number): Player {
  return {
    id,
    name: `Joueur ${id}`,
    names: { fr: `Joueur ${id}`, en: `Player ${id}`, ja: `選手 ${id}` },
    nameOriginal: `Senshu ${id}`,
    nickname: `J${id}`,
    nicknames: { fr: `J${id}`, en: `P${id}`, ja: `選${id}` },
    image: `portraits/${id}.png`,
    game: "Victory Road",
    team: "Raimon",
    teamId: 42,
    teamNames: { fr: "Raimon", en: "Raimon", ja: "雷門" },
    position: "MF",
    altPosition: "FW",
    element: "Wind",
    buildType: "bond",
    role: "Player",
    gender: "Neutral",
    spiritDrop: true,
    ageGroup: "Junior",
    year: "2",
    stats,
    statsLv50: { ...stats, kick: 80 },
    total: 728,
    skills: [{ level: 1, abilityId: "move-1" }],
    skillsAlt: [{ level: 30, abilityId: "move-alt" }],
    heroSkills: { skills: [{ level: 1, abilityId: "hero-1" }], skillsAlt: [] },
    basaraSkills: null,
    heroStats: { lv50: { ...stats, kick: 120 }, lv99: { ...stats, kick: 150 } },
    basaraStats: null,
  };
}

describe("player shard codec", () => {
  test("round-trips the complete domain model", () => {
    const players = [player(1), player(2)];
    expect(decodePlayerShard(encodePlayerShard(players))).toEqual(players);
  });

  test("deduplicates shared series and team labels", () => {
    const shard = encodePlayerShard([player(1), player(2)]);
    expect(shard.g).toEqual(["Victory Road"]);
    expect(shard.t).toHaveLength(1);
  });

  test("rejects an incompatible cached artifact", () => {
    expect(() => decodePlayerShard({ v: 1, g: [], t: [], p: [] })).toThrow(
      "unsupported player shard version",
    );
  });
});
