import type { Team } from "./team";

const MAX_HISTORY = 60;
const NAME_COALESCE_MS = 750;

export interface TeamHistory {
  past: Team[];
  present: Team;
  future: Team[];
  lastMutation: "name" | null;
  lastMutationAt: number;
}

type TeamUpdate = Team | ((current: Team) => Team);

export type TeamHistoryAction =
  { type: "update"; update: TeamUpdate; at: number } | { type: "undo" } | { type: "redo" };

export function createTeamHistory(team: Team): TeamHistory {
  return { past: [], present: team, future: [], lastMutation: null, lastMutationAt: 0 };
}

function changesNameOnly(previous: Team, next: Team): boolean {
  if (previous.name === next.name) return false;
  return (
    previous.formationId === next.formationId &&
    previous.rulesetId === next.rulesetId &&
    previous.offensiveSynergyId === next.offensiveSynergyId &&
    previous.defensiveSynergyId === next.defensiveSynergyId &&
    previous.teamBuildType === next.teamBuildType &&
    previous.buildRank === next.buildRank &&
    previous.tacticIds === next.tacticIds &&
    previous.slots === next.slots
  );
}

export function teamHistoryReducer(history: TeamHistory, action: TeamHistoryAction): TeamHistory {
  if (action.type === "undo") {
    const previous = history.past.at(-1);
    if (!previous) return history;
    return {
      past: history.past.slice(0, -1),
      present: previous,
      future: [history.present, ...history.future],
      lastMutation: null,
      lastMutationAt: 0,
    };
  }

  if (action.type === "redo") {
    const next = history.future[0];
    if (!next) return history;
    return {
      past: [...history.past, history.present].slice(-MAX_HISTORY),
      present: next,
      future: history.future.slice(1),
      lastMutation: null,
      lastMutationAt: 0,
    };
  }

  const next = typeof action.update === "function" ? action.update(history.present) : action.update;
  if (next === history.present) return history;

  const nameOnly = changesNameOnly(history.present, next);
  const coalesceName =
    nameOnly &&
    history.lastMutation === "name" &&
    action.at - history.lastMutationAt <= NAME_COALESCE_MS;

  return {
    past: coalesceName ? history.past : [...history.past, history.present].slice(-MAX_HISTORY),
    present: next,
    future: [],
    lastMutation: nameOnly ? "name" : null,
    lastMutationAt: action.at,
  };
}
