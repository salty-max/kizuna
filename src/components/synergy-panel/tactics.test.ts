import { describe, expect, test } from "bun:test";

import { tacticSlots, updateTacticSlot } from "./tactics";

describe("tacticSlots", () => {
  test("pads the selection to the number of slots allowed by the game", () => {
    expect(tacticSlots(["first"])).toEqual(["first", "", ""]);
  });

  test("ignores values beyond the game limit", () => {
    expect(tacticSlots(["one", "two", "three", "four"])).toEqual(["one", "two", "three"]);
  });
});

describe("updateTacticSlot", () => {
  test("updates the selected slot", () => {
    expect(updateTacticSlot(["one", "two"], 1, "replacement")).toEqual(["one", "replacement"]);
  });

  test("compacts empty slots while preserving order", () => {
    expect(updateTacticSlot(["one", "two", "three"], 0, "")).toEqual(["two", "three"]);
  });
});
