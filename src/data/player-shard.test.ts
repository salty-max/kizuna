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
    characterId: `c0${id}`,
    modelStem: id === 1 ? "1/k/e/x/example" : "",
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
    foundIn: [],
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

  test("interns location ids so a shared battle is spelled out once", () => {
    const players = [
      { ...player(1), foundIn: ["fbtl_a", "star_1"] },
      { ...player(2), foundIn: ["fbtl_a"] },
    ];
    const shard = encodePlayerShard(players);

    expect(shard.l).toEqual(["fbtl_a", "star_1"]);
    expect(shard.p.map((row) => row[33])).toEqual([[0, 1], [0]]);
    expect(decodePlayerShard(shard)).toEqual(players);
  });

  test("ships only the turntable leaf and rebuilds the CDN path on the way back", () => {
    const shard = encodePlayerShard([player(1)]);
    expect(shard.p[0]?.[32]).toBe("example");
    expect(decodePlayerShard(shard)[0]?.modelStem).toBe("1/k/e/x/example");
  });

  test("keeps a stem the fan-out rule cannot rebuild rather than mangling it", () => {
    const odd = { ...player(1), modelStem: "2/z/other/path" };
    const shard = encodePlayerShard([odd]);
    expect(shard.p[0]?.[32]).toBe("2/z/other/path");
    expect(decodePlayerShard(shard)[0]?.modelStem).toBe("2/z/other/path");
  });

  test("rejects an incompatible cached artifact", () => {
    expect(() => decodePlayerShard({ v: 3, g: [], t: [], l: [], p: [] })).toThrow(
      "unsupported player shard version",
    );
  });

  test("refuses a location index the dictionary does not cover", () => {
    const shard = encodePlayerShard([{ ...player(1), foundIn: ["fbtl_a"] }]);
    shard.l = [];
    expect(() => decodePlayerShard(shard)).toThrow("invalid location reference");
  });
});
