import { describe, expect, test } from "bun:test";

import { clearTeamAssignments, createTeam, filledAssignment } from "./team";

describe("clearTeamAssignments", () => {
  test("clears the roster without resetting the team setup", () => {
    const team = createTeam("4-3-3-triangle");
    team.name = "Onze tactique";
    team.rulesetId = "tournament";
    team.teamBuildType = "counter";
    team.buildRank = 3;
    team.offensiveSynergyId = "flag-1";
    team.defensiveSynergyId = "pillar-1";
    team.tacticIds = ["tactic-1"];
    const firstSlotId = Object.keys(team.slots)[0]!;
    team.slots[firstSlotId] = filledAssignment(42, {
      equipment: { boots: "boots-1" },
      passives: [{ passiveId: "passive-1", value: 10 }],
    });

    const cleared = clearTeamAssignments(team);

    expect(cleared).toMatchObject({
      name: "Onze tactique",
      formationId: "4-3-3-triangle",
      rulesetId: "tournament",
      teamBuildType: "counter",
      buildRank: 3,
      offensiveSynergyId: "flag-1",
      defensiveSynergyId: "pillar-1",
      tacticIds: ["tactic-1"],
    });
    expect(Object.values(cleared.slots).every((slot) => slot.playerId === null)).toBe(true);
    expect(cleared.slots[firstSlotId]?.equipment).toEqual({});
    expect(
      cleared.slots[firstSlotId]?.passives.every((passive) => passive.passiveId === null),
    ).toBe(true);
    expect(cleared.slots).not.toBe(team.slots);
  });
});
