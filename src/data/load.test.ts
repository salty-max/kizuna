import { describe, expect, test } from "bun:test";

import { BUILDER_SHARDS, DATA_SHARDS, datasetShardsForPath } from "./load";

describe("datasetShardsForPath", () => {
  test("loads every catalogue the builder can put on the pitch", () => {
    expect(datasetShardsForPath("/")).toEqual(BUILDER_SHARDS);
  });

  test("spares the builder the catalogues only a wiki page reads", () => {
    expect(BUILDER_SHARDS).not.toContain("locations");
    expect(DATA_SHARDS).toContain("locations");
  });

  test("loads metadata only for the wiki landing page", () => {
    expect(datasetShardsForPath("/wiki")).toEqual([]);
  });

  test("loads only the catalogue used by a simple wiki section", () => {
    expect(datasetShardsForPath("/wiki/equipment")).toEqual(["equipment"]);
    expect(datasetShardsForPath("/wiki/equipment/eq_sh_test")).toEqual(["equipment"]);
    expect(datasetShardsForPath("/wiki/passives")).toEqual(["passives"]);
    expect(datasetShardsForPath("/wiki/tactics/one")).toEqual(["tactics"]);
  });

  test("adds the dependencies needed by relational pages", () => {
    expect(datasetShardsForPath("/wiki/bonds")).toEqual(["players", "synergies"]);
    expect(datasetShardsForPath("/wiki/bonds/sf01001")).toEqual(["players", "synergies"]);
    expect(datasetShardsForPath("/wiki/players")).toEqual(["players"]);
    expect(datasetShardsForPath("/wiki/players/1")).toEqual(["players", "abilities", "locations"]);
  });
});
