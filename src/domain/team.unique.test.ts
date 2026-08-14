import { describe, expect, test } from "bun:test";

import {
  canMoveSlotAssignment,
  createTeam,
  filledAssignment,
  moveSlotAssignment,
  normalizeTeam,
  updateSlotAssignment,
} from "./team";

describe("player entry uniqueness", () => {
  test("moves an already assigned player from the pitch to the bench", () => {
    const team = createTeam();
    team.slots.gk = filledAssignment(42);

    const moved = updateSlotAssignment(team, "bench1", filledAssignment(42));

    expect(moved.slots.gk?.playerId).toBeNull();
    expect(moved.slots.bench1?.playerId).toBe(42);
  });

  test("also enforces uniqueness between staff slots and the player roster", () => {
    const team = createTeam();
    team.slots.manager1 = filledAssignment(42);

    const moved = updateSlotAssignment(team, "coach", filledAssignment(42));

    expect(moved.slots.manager1?.playerId).toBeNull();
    expect(moved.slots.coach?.playerId).toBe(42);
  });

  test("keeps distinct database variants available in standard play", () => {
    const team = createTeam();
    team.slots.gk = filledAssignment(42);

    const next = updateSlotAssignment(team, "bench1", filledAssignment(43));

    expect(next.slots.gk?.playerId).toBe(42);
    expect(next.slots.bench1?.playerId).toBe(43);
  });

  test("repairs duplicate ids from old saves and shared teams", () => {
    const team = createTeam();
    team.slots.gk = filledAssignment(42);
    team.slots.bench1 = filledAssignment(42);
    team.slots.manager1 = filledAssignment(42);

    const normalized = normalizeTeam(team);

    expect(normalized.slots.gk?.playerId).toBe(42);
    expect(normalized.slots.bench1?.playerId).toBeNull();
    expect(normalized.slots.manager1?.playerId).toBeNull();
  });

  test("moves a complete build into an empty slot", () => {
    const team = createTeam();
    team.slots.gk = filledAssignment(42, {
      rarity: "hero",
      equipment: { boots: "eq-boots" },
    });

    const moved = moveSlotAssignment(team, "gk", "bench1");

    expect(moved.slots.gk?.playerId).toBeNull();
    expect(moved.slots.bench1?.playerId).toBe(42);
    expect(moved.slots.bench1?.rarity).toBe("hero");
    expect(moved.slots.bench1?.equipment.boots).toBe("eq-boots");
  });

  test("swaps complete builds when both slots are occupied", () => {
    const team = createTeam();
    team.slots.gk = filledAssignment(42, { rarity: "hero" });
    team.slots.bench1 = filledAssignment(99, { rarity: "basara" });

    const swapped = moveSlotAssignment(team, "gk", "bench1");

    expect(swapped.slots.gk?.playerId).toBe(99);
    expect(swapped.slots.gk?.rarity).toBe("basara");
    expect(swapped.slots.bench1?.playerId).toBe(42);
    expect(swapped.slots.bench1?.rarity).toBe("hero");
  });

  test("rejects moves between player and staff passive catalogues", () => {
    const team = createTeam();
    team.slots.gk = filledAssignment(42);
    team.slots.manager1 = filledAssignment(99);

    expect(canMoveSlotAssignment(team, "gk", "manager1")).toBe(false);
    expect(moveSlotAssignment(team, "gk", "manager1")).toBe(team);
    expect(canMoveSlotAssignment(team, "gk", "bench1")).toBe(true);
    expect(canMoveSlotAssignment(team, "manager1", "manager2")).toBe(true);
  });
});
