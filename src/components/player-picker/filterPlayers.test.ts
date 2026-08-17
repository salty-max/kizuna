import { describe, expect, test } from "bun:test";

import type { Player } from "@/domain/types";
import { filterAndSortPlayers, type PlayerFilters } from "./filterPlayers";

const stats = {
  kick: 10,
  control: 10,
  technique: 10,
  pressure: 10,
  physical: 10,
  agility: 10,
  intelligence: 10,
};

function player(overrides: Partial<Player> & Pick<Player, "id" | "name">): Player {
  return {
    names: {},
    nameOriginal: "",
    nickname: "",
    image: "",
    characterId: "",
    modelStem: "",
    game: "Inazuma Eleven",
    team: "Raimon",
    teamId: 1,
    teamNames: {},
    position: "MF",
    altPosition: null,
    element: "Wind",
    buildType: "justice",
    role: "Player",
    gender: "Male",
    spiritDrop: false,
    foundIn: [],
    ageGroup: "Middle school",
    year: "2",
    stats,
    statsLv50: stats,
    total: 70,
    heroStats: null,
    basaraStats: null,
    skills: [],
    skillsAlt: [],
    heroSkills: null,
    basaraSkills: null,
    ...overrides,
  };
}

const defaults: PlayerFilters = {
  query: "",
  position: null,
  element: null,
  buildType: null,
  game: null,
  team: null,
  gender: null,
  obtainableOnly: false,
  heroForm: false,
  basaraForm: false,
  sort: "total",
};

describe("filterAndSortPlayers", () => {
  test("searches localized and original names without accents", () => {
    const players = [
      player({ id: 1, name: "Axel Blaze", names: { fr: "Axel Blaze" } }),
      player({ id: 2, name: "Riccardo", nameOriginal: "Shindou Takuto" }),
      player({ id: 3, name: "Émile", names: { en: "Emile" } }),
    ];

    expect(
      filterAndSortPlayers(players, { ...defaults, query: "emile" }).map(({ id }) => id),
    ).toEqual([3]);
    expect(
      filterAndSortPlayers(players, { ...defaults, query: "shindou" }).map(({ id }) => id),
    ).toEqual([2]);
  });

  test("combines gameplay filters", () => {
    const eligible = player({
      id: 1,
      name: "Eligible",
      position: "FW",
      element: "Fire",
      foundIn: ["fbtl_a"],
      heroStats: { lv50: stats, lv99: stats },
    });
    const wrongPosition = player({
      id: 2,
      name: "Wrong position",
      position: "DF",
      element: "Fire",
      foundIn: ["fbtl_a"],
      heroStats: { lv50: stats, lv99: stats },
    });

    expect(
      filterAndSortPlayers([wrongPosition, eligible], {
        ...defaults,
        position: "FW",
        element: "Fire",
        obtainableOnly: true,
        heroForm: true,
      }).map(({ id }) => id),
    ).toEqual([1]);
  });

  test("obtainable keeps whoever a drop table lists, not the narrower spirit flag", () => {
    // 396 characters carry `spiritDrop`; 4856 have a location. Filtering on the
    // flag hid the other 4460 from anyone asking "who can I actually get?".
    const dropTableOnly = player({
      id: 1,
      name: "Rollable",
      spiritDrop: false,
      foundIn: ["star_1"],
    });
    const unobtainable = player({ id: 2, name: "Unobtainable", spiritDrop: true, foundIn: [] });

    expect(
      filterAndSortPlayers([dropTableOnly, unobtainable], {
        ...defaults,
        obtainableOnly: true,
      }).map(({ id }) => id),
    ).toEqual([1]);
  });

  test("sorts by total or derived power", () => {
    const higherTotal = player({ id: 1, name: "Total", total: 100 });
    const strongerShot = player({
      id: 2,
      name: "Shot",
      total: 90,
      stats: { ...stats, kick: 80, control: 40 },
    });

    expect(filterAndSortPlayers([higherTotal, strongerShot], defaults).map(({ id }) => id)).toEqual(
      [1, 2],
    );
    expect(
      filterAndSortPlayers([higherTotal, strongerShot], {
        ...defaults,
        sort: "shootAT",
      }).map(({ id }) => id),
    ).toEqual([2, 1]);
  });
});
