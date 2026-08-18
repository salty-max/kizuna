import { describe, expect, test } from "bun:test";

import { axisFraction } from "./radar";

describe("axisFraction", () => {
  test("places a value proportionally along the axis", () => {
    expect(axisFraction(246, 492)).toBe(0.5);
    expect(axisFraction(492, 492)).toBe(1);
  });

  test("pegs at the edge instead of drawing outside the frame", () => {
    // A geared-up character exceeded the old fixed ceiling of 280 and sent the
    // polygon out over the labels.
    expect(axisFraction(600, 492)).toBe(1);
  });

  test("never returns a negative radius", () => {
    expect(axisFraction(-40, 492)).toBe(0);
  });

  test("survives a missing or zero ceiling", () => {
    expect(axisFraction(200, 0)).toBe(0);
    expect(axisFraction(200, Number.NaN)).toBe(0);
  });
});
