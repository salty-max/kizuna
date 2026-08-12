import { describe, expect, test } from "bun:test";

import { FORMATIONS, findFormation } from "./formations";

/**
 * The coordinates are generated from Level-5's own formations page, so these
 * guard the transcription rather than a design decision: if a regeneration ever
 * drops a slot, mislabels a line or leaves the site's unused top half in, this
 * catches it.
 */
describe("formations", () => {
  test("are the eight the game ships", () => {
    expect(FORMATIONS.map((f) => f.name)).toEqual([
      "4-4-2 Diamond",
      "4-4-2 Box",
      "3-5-2 Freedom",
      "4-3-3 Triangle",
      "4-3-3 Delta",
      "4-5-1 Balanced",
      "3-6-1 Hexa",
      "5-4-1 Double Volante",
    ]);
  });

  test("each field eleven players", () => {
    for (const formation of FORMATIONS) {
      expect(formation.slots).toHaveLength(11);
    }
  });

  test("have exactly one keeper, at their own goal", () => {
    for (const formation of FORMATIONS) {
      const keepers = formation.slots.filter((s) => s.position === "GK");
      expect(keepers).toHaveLength(1);
      expect(keepers[0]!.y).toBe(0);
    }
  });

  test("break down the way their name says", () => {
    for (const formation of FORMATIONS) {
      const [df, mf, fw] = formation.name
        .match(/^(\d)-(\d)-(\d)/)!
        .slice(1)
        .map(Number);
      const count = (position: string) =>
        formation.slots.filter((s) => s.position === position).length;

      expect({ name: formation.name, df: count("DF"), mf: count("MF"), fw: count("FW") }).toEqual({
        name: formation.name,
        df: df!,
        mf: mf!,
        fw: fw!,
      });
    }
  });

  test("use the full height — the site's empty top half is normalised away", () => {
    for (const formation of FORMATIONS) {
      const ys = formation.slots.map((s) => s.y);
      expect(Math.min(...ys)).toBe(0);
      expect(Math.max(...ys)).toBe(100);
    }
  });

  test("keep every slot inside the board", () => {
    for (const formation of FORMATIONS) {
      for (const slot of formation.slots) {
        expect(slot.x).toBeGreaterThanOrEqual(0);
        expect(slot.x).toBeLessThanOrEqual(100);
      }
    }
  });

  test("give every slot a unique id", () => {
    for (const formation of FORMATIONS) {
      const ids = formation.slots.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  test("order slots from own goal forward, so the share encoding is stable", () => {
    for (const formation of FORMATIONS) {
      const ys = formation.slots.map((s) => s.y);
      expect([...ys].sort((a, b) => a - b)).toEqual(ys);
    }
  });

  test("fall back to the default rather than throwing on an unknown id", () => {
    expect(findFormation("4-4-2").id).toBe("4-4-2-diamond");
  });
});
