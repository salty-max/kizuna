import { describe, expect, test } from "bun:test";

import { createTeam } from "./team";
import { createTeamHistory, teamHistoryReducer } from "./teamHistory";

describe("team history", () => {
  test("undoes and redoes a team mutation", () => {
    const initial = createTeam();
    const changed = { ...initial, rulesetId: "tournament" as const };
    const updated = teamHistoryReducer(createTeamHistory(initial), {
      type: "update",
      update: changed,
      at: 100,
    });

    const undone = teamHistoryReducer(updated, { type: "undo" });
    expect(undone.present).toBe(initial);
    expect(undone.future[0]).toBe(changed);

    const redone = teamHistoryReducer(undone, { type: "redo" });
    expect(redone.present).toBe(changed);
  });

  test("coalesces continuous team-name typing into one undo step", () => {
    const initial = createTeam();
    const first = teamHistoryReducer(createTeamHistory(initial), {
      type: "update",
      update: { ...initial, name: "K" },
      at: 100,
    });
    const second = teamHistoryReducer(first, {
      type: "update",
      update: { ...first.present, name: "Ki" },
      at: 200,
    });

    expect(second.past).toHaveLength(1);
    expect(teamHistoryReducer(second, { type: "undo" }).present.name).toBe("");
  });

  test("a new change clears the redo branch", () => {
    const initial = createTeam();
    const changed = { ...initial, name: "First" };
    const updated = teamHistoryReducer(createTeamHistory(initial), {
      type: "update",
      update: changed,
      at: 100,
    });
    const undone = teamHistoryReducer(updated, { type: "undo" });
    const branched = teamHistoryReducer(undone, {
      type: "update",
      update: { ...initial, name: "Second" },
      at: 200,
    });

    expect(branched.future).toEqual([]);
  });
});
