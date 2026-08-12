import { describe, expect, test } from "bun:test";

import { FORMATIONS } from "./formations";
import { layoutPitchSlots } from "./layoutPitch";

const CARD_W = 124;
const CARD_H = 60;
const GAP = 6;
const SHEAR_EXTRA = Math.ceil(CARD_H * Math.tan((9 * Math.PI) / 180));
const BOARD_W = 720;
const BOARD_H = 500;
const PLAYABLE_W = BOARD_W - CARD_W;
const PLAYABLE_H = BOARD_H - CARD_H - 24;

const layoutOpts = {
  playableW: PLAYABLE_W,
  playableH: PLAYABLE_H,
  cardW: CARD_W,
  cardH: CARD_H,
  shearExtraW: SHEAR_EXTRA,
  gap: GAP,
};

function aabbOverlaps(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  const minDx = CARD_W + SHEAR_EXTRA + GAP;
  const minDy = CARD_H + GAP;
  const dx = (Math.abs(a.x - b.x) / 100) * PLAYABLE_W;
  const dy = (Math.abs(a.y - b.y) / 100) * PLAYABLE_H;
  return dx < minDx && dy < minDy;
}

/** Unique depth bands (rounded), sorted own-goal → opposition. */
function depthBands(slots: { y: number }[]): number[] {
  return [...new Set(slots.map((s) => Math.round(s.y)))].sort((a, b) => a - b);
}

describe("layoutPitchSlots", () => {
  test("keeps every slot id and stays inside 0–100", () => {
    for (const formation of FORMATIONS) {
      const laid = layoutPitchSlots(formation.slots, layoutOpts);
      expect(laid.map((s) => s.id)).toEqual(formation.slots.map((s) => s.id));
      for (const slot of laid) {
        expect(slot.x).toBeGreaterThanOrEqual(0);
        expect(slot.x).toBeLessThanOrEqual(100);
        expect(slot.y).toBeGreaterThanOrEqual(0);
        expect(slot.y).toBeLessThanOrEqual(100);
      }
    }
  });

  test("clears card AABBs (incl. shear) on every formation", () => {
    for (const formation of FORMATIONS) {
      const laid = layoutPitchSlots(formation.slots, layoutOpts);
      const collisions: string[] = [];
      for (let i = 0; i < laid.length; i++) {
        for (let j = i + 1; j < laid.length; j++) {
          const a = laid[i]!;
          const b = laid[j]!;
          if (aabbOverlaps(a, b)) collisions.push(`${a.id}↔${b.id}`);
        }
      }
      expect({ formation: formation.name, collisions }).toEqual({
        formation: formation.name,
        collisions: [],
      });
    }
  });

  test("preserves left-right order of originally distinct columns", () => {
    for (const formation of FORMATIONS) {
      const laid = layoutPitchSlots(formation.slots, layoutOpts);
      const byId = new Map(laid.map((s) => [s.id, s]));
      for (let i = 0; i < formation.slots.length; i++) {
        for (let j = i + 1; j < formation.slots.length; j++) {
          const a0 = formation.slots[i]!;
          const b0 = formation.slots[j]!;
          if (Math.abs(a0.x - b0.x) < 5) continue;
          const a = byId.get(a0.id)!;
          const b = byId.get(b0.id)!;
          if (a0.x < b0.x) expect(a.x).toBeLessThanOrEqual(b.x);
          else expect(a.x).toBeGreaterThanOrEqual(b.x);
        }
      }
    }
  });

  test("uses the full height and keeps major depth lines roughly even", () => {
    for (const formation of FORMATIONS) {
      const laid = layoutPitchSlots(formation.slots, layoutOpts);
      expect(Math.min(...laid.map((s) => s.y))).toBeLessThanOrEqual(2);
      expect(Math.max(...laid.map((s) => s.y))).toBeGreaterThanOrEqual(98);

      // Collapse residual micro-offsets so we measure line-to-line gaps.
      const raw = depthBands(laid);
      const lines: number[] = [raw[0]!];
      for (let i = 1; i < raw.length; i++) {
        if (raw[i]! - lines[lines.length - 1]! > 6) lines.push(raw[i]!);
      }
      if (lines.length < 3) continue;

      const gaps: number[] = [];
      for (let i = 1; i < lines.length; i++) gaps.push(lines[i]! - lines[i - 1]!);
      const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      // No line gap should be more than ~1.6× the mean (was ~3–4× with raw coords).
      for (const g of gaps) {
        expect(g).toBeLessThanOrEqual(mean * 1.6 + 1);
      }
      // And no tiny crushed gap at the back (GK vs DF used to be ~13 while mean ~25+).
      expect(Math.min(...gaps)).toBeGreaterThanOrEqual(mean * 0.55);
    }
  });

  test("keeps front-to-back order of originally distinct depths", () => {
    for (const formation of FORMATIONS) {
      const laid = layoutPitchSlots(formation.slots, layoutOpts);
      const byId = new Map(laid.map((s) => [s.id, s]));
      for (let i = 0; i < formation.slots.length; i++) {
        for (let j = i + 1; j < formation.slots.length; j++) {
          const a0 = formation.slots[i]!;
          const b0 = formation.slots[j]!;
          // Only compare clearly different lines (beyond stagger cluster).
          if (Math.abs(a0.y - b0.y) < 6) continue;
          const a = byId.get(a0.id)!;
          const b = byId.get(b0.id)!;
          if (a0.y < b0.y) expect(a.y).toBeLessThanOrEqual(b.y + 0.5);
          else expect(a.y).toBeGreaterThanOrEqual(b.y - 0.5);
        }
      }
    }
  });
});
