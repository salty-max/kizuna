import { describe, expect, test } from "bun:test";

import { groupFoundIn, locationDisplayName } from "./locations";
import type { GameLocation } from "./types";

function location(
  id: string,
  kind: GameLocation["kind"],
  names: GameLocation["names"] = {},
): GameLocation {
  return { id, kind, name: names.fr ?? names.en ?? "", names };
}

const CATALOGUE: GameLocation[] = [
  location("star_2", "universe", { fr: "Éclaris", en: "Eclaris" }),
  location("star_1", "universe", { fr: "Boulederius", en: "Boulderius" }),
  location("fbtl_b", "match", { fr: "Le serment", en: "The oath" }),
  location("fbtl_a", "match", { fr: "Le prince des neiges", en: "The snow prince" }),
  // The same battle at two difficulties — different ids, one name.
  location("fbtl_c_010", "match", { fr: "La forteresse", en: "The fortress" }),
  location("fbtl_c_110", "match", { fr: "La forteresse", en: "The fortress" }),
  location("tgs24_0001", "match"),
  location("tgs24_0002", "match"),
];

function names(result: ReturnType<typeof groupFoundIn>, index = 0) {
  return result.groups[index]?.entries.map((entry) => entry.location.id);
}

describe("groupFoundIn", () => {
  test("puts the battles you can replay before the star signs you roll", () => {
    const { groups } = groupFoundIn(["star_1", "fbtl_a"], CATALOGUE, "fr");
    expect(groups.map((group) => group.kind)).toEqual(["match", "universe"]);
  });

  test("omits a kind entirely rather than showing an empty group", () => {
    const { groups } = groupFoundIn(["star_1"], CATALOGUE, "fr");
    expect(groups).toHaveLength(1);
    expect(groups[0]?.kind).toBe("universe");
  });

  test("sorts each group by its name in the active locale, not by a fixed one", () => {
    // These two invert between the catalogues: "Le prince des neiges" precedes
    // "Le serment", while "The oath" precedes "The snow prince". A sort blind to
    // the active locale gets one of the two orders wrong.
    expect(names(groupFoundIn(["fbtl_b", "fbtl_a"], CATALOGUE, "fr"))).toEqual([
      "fbtl_a",
      "fbtl_b",
    ]);
    expect(names(groupFoundIn(["fbtl_a", "fbtl_b"], CATALOGUE, "en"))).toEqual([
      "fbtl_b",
      "fbtl_a",
    ]);
  });

  test("folds the difficulties of one battle into a single entry, keeping both ids", () => {
    const { groups } = groupFoundIn(["fbtl_c_110", "fbtl_c_010", "fbtl_a"], CATALOGUE, "fr");
    const entries = groups[0]?.entries ?? [];
    expect(entries).toHaveLength(2);
    const folded = entries.find((entry) => entry.location.id.startsWith("fbtl_c"));
    expect(folded?.ids).toEqual(["fbtl_c_010", "fbtl_c_110"]);
  });

  test("keeps unnamed locations apart — they share no name to fold on", () => {
    const { groups } = groupFoundIn(["tgs24_0001", "tgs24_0002"], CATALOGUE, "fr");
    expect(groups[0]?.entries.map((entry) => entry.ids)).toEqual([["tgs24_0001"], ["tgs24_0002"]]);
  });

  test("sinks the location the game never names to the bottom of its group", () => {
    const result = groupFoundIn(["tgs24_0001", "fbtl_b", "fbtl_a"], CATALOGUE, "fr");
    expect(names(result)).toEqual(["fbtl_a", "fbtl_b", "tgs24_0001"]);
  });

  test("collapses a location listed twice under the same id", () => {
    const { groups } = groupFoundIn(["fbtl_a", "fbtl_a"], CATALOGUE, "fr");
    expect(groups[0]?.entries).toHaveLength(1);
    expect(groups[0]?.entries[0]?.ids).toEqual(["fbtl_a"]);
  });

  test("reports an id the catalogue cannot resolve instead of dropping it silently", () => {
    const { groups, unresolved } = groupFoundIn(["fbtl_a", "fbtl_ghost"], CATALOGUE, "fr");
    expect(unresolved).toEqual(["fbtl_ghost"]);
    expect(names({ groups, unresolved })).toEqual(["fbtl_a"]);
  });

  test("has nothing to show for a character no drop table hands out", () => {
    expect(groupFoundIn([], CATALOGUE, "fr")).toEqual({ groups: [], unresolved: [] });
  });
});

describe("locationDisplayName", () => {
  test("prefers the active locale, then any language the dump filled", () => {
    const entry = location("x", "match", { en: "The oath" });
    expect(locationDisplayName(entry, "fr")).toBe("The oath");
    expect(locationDisplayName(entry, "en")).toBe("The oath");
  });

  test("returns null when the game names the place in no language at all", () => {
    expect(locationDisplayName(location("tgs24_0001", "match"), "fr")).toBeNull();
  });
});
