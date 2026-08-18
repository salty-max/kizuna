import { describe, expect, test } from "bun:test";

import { grantedMove, spiritsGranting } from "./spirits";
import type { Ability } from "./types";

function ability(id: string, name: string, grantsAbilityId: string | null = null): Ability {
  return {
    id,
    name,
    names: { fr: name },
    description: "",
    descriptions: {},
    kind: grantsAbilityId ? "aura" : "hissatsu",
    type: grantsAbilityId ? "Aura" : "Shoot",
    auraType: grantsAbilityId ? "keshin" : null,
    grantsAbilityId,
    element: null,
    power: 0,
    tension: 0,
    extra: "",
    shop: "",
  };
}

const MOVE = ability("move-1", "Rat-a-Tat Pass");
const CATALOGUE: Ability[] = [
  MOVE,
  ability("aura-2", "White Pawn", "move-1"),
  ability("aura-1", "Black Pawn", "move-1"),
  ability("aura-3", "Lone Spirit", "move-missing"),
  ability("aura-4", "Spiritless"),
];
const BY_ID = new Map(CATALOGUE.map((entry) => [entry.id, entry]));
const name = (entry: Ability) => entry.name;

describe("grantedMove", () => {
  test("resolves the move a spirit grants", () => {
    expect(grantedMove(CATALOGUE[1]!, BY_ID)?.name).toBe("Rat-a-Tat Pass");
  });

  test("is null for a spirit that grants nothing", () => {
    expect(grantedMove(CATALOGUE[4]!, BY_ID)).toBeNull();
  });

  test("is null rather than throwing when the catalogue is short", () => {
    // The route may load a subset; a dangling id must degrade, not crash.
    expect(grantedMove(CATALOGUE[3]!, BY_ID)).toBeNull();
  });
});

describe("spiritsGranting", () => {
  test("lists every spirit behind one move, alphabetically", () => {
    expect(spiritsGranting("move-1", CATALOGUE, name).map((a) => a.name)).toEqual([
      "Black Pawn",
      "White Pawn",
    ]);
  });

  test("folds the duplicates the dump ships under one name", () => {
    const twice = [...CATALOGUE, ability("aura-5", "White Pawn", "move-1")];
    expect(spiritsGranting("move-1", twice, name).map((a) => a.name)).toEqual([
      "Black Pawn",
      "White Pawn",
    ]);
  });

  test("is empty for a move no spirit grants", () => {
    expect(spiritsGranting("move-none", CATALOGUE, name)).toEqual([]);
  });
});
