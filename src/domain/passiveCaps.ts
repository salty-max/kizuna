import type { PassiveCondition, PassiveEffect, PassiveScope, PassiveStat } from "./types";

/** Stable ids for the caps Level-5 published with game version 1.5. */
export type PassiveCapId =
  | "breachWallPierce"
  | "breachTensionCost"
  | "battleWinTension"
  | "highTensionFocus"
  | "fullTensionShot"
  | "recoveryShot"
  | "recoveryFocus"
  | "recoveryKp"
  | "recoveryRoughAttack"
  | "passBondGain"
  | "bondScramble"
  | "bondDirectShot"
  | "lostScrambleBondLoss"
  | "outsideZoneFoul"
  | "dashFoul"
  | "dashTension"
  | "dashRoughAttack"
  | "dashBondGain"
  | "opponentFoulBondGain"
  | "cleanWall"
  | "cleanAtDf"
  | "substituteAt"
  | "substituteDf"
  | "tacticCooldown"
  | "firstHalfAt"
  | "secondHalfDf";

export interface PassiveCap {
  id: PassiveCapId;
  /** Signed limit: positive values are maxima; negative values are minima. */
  limit: number;
}

type PercentEffect = Extract<PassiveEffect, { mode: "percent" }>;

function has(effect: PercentEffect, condition: PassiveCondition): boolean {
  return effect.conditions.includes(condition);
}

function is(effect: PercentEffect, stat: PassiveStat, condition?: PassiveCondition): boolean {
  return effect.stat === stat && (condition === undefined || has(effect, condition));
}

function scoped(effect: PercentEffect, scopes: PassiveScope[]): boolean {
  return scopes.includes(effect.scope);
}

/**
 * Map one structured passive effect to its official team cap, when published.
 * Other passives also have caps, but Level-5 explicitly says the unpublished
 * ones cannot currently be reached with legal configurations.
 */
export function passiveCapFor(effect: PercentEffect): PassiveCap | null {
  if (is(effect, "wallPierce", "teamBreachRateAtLeast15")) {
    return { id: "breachWallPierce", limit: 100 };
  }
  if (is(effect, "breachTensionRequirement")) {
    return { id: "breachTensionCost", limit: -80 };
  }
  if (is(effect, "tension", "whenWinningFocusOrScramble")) {
    return { id: "battleWinTension", limit: 150 };
  }
  if (is(effect, "focus", "tensionAtLeast50")) {
    return { id: "highTensionFocus", limit: 50 };
  }
  if (is(effect, "shotAT", "tensionAt100")) {
    return { id: "fullTensionShot", limit: 200 };
  }
  if (has(effect, "afterBallRecoveryNoDirectCatch")) {
    if (effect.stat === "shotAT") return { id: "recoveryShot", limit: 100 };
    if (effect.stat === "focus") return { id: "recoveryFocus", limit: 50 };
    if (effect.stat === "KP") return { id: "recoveryKp", limit: 100 };
    if (effect.stat === "roughAttack") return { id: "recoveryRoughAttack", limit: 100 };
  }
  if (is(effect, "bondGain", "onTeamPass")) return { id: "passBondGain", limit: 150 };
  if (is(effect, "scramble", "bondPowerAtLeast20")) {
    return { id: "bondScramble", limit: 250 };
  }
  if (is(effect, "directShotAT", "bondPowerAtLeast20")) {
    return { id: "bondDirectShot", limit: 150 };
  }
  if (is(effect, "bondLoss", "onLostScramble")) {
    return { id: "lostScrambleBondLoss", limit: -100 };
  }
  if (is(effect, "foulRate", "outsideZoneArea")) {
    return { id: "outsideZoneFoul", limit: -80 };
  }
  if (is(effect, "foulRate", "whileDashing")) return { id: "dashFoul", limit: -80 };
  if (has(effect, "onMarkedOrBlockedWhileDashing")) {
    if (effect.stat === "tension") return { id: "dashTension", limit: 50 };
    if (effect.stat === "roughAttack") return { id: "dashRoughAttack", limit: 100 };
    if (effect.stat === "bondGain") return { id: "dashBondGain", limit: 200 };
  }
  if (is(effect, "bondGain", "onOpponentFoul")) {
    return { id: "opponentFoulBondGain", limit: 200 };
  }
  if (is(effect, "wallDF", "noFoulCommittedYet")) return { id: "cleanWall", limit: 50 };
  if (is(effect, "all", "noFoulCommittedYet")) return { id: "cleanAtDf", limit: 50 };
  if (has(effect, "afterSubstitution") || effect.scope === "subbedOnPlayer") {
    if (effect.stat === "AT") return { id: "substituteAt", limit: 150 };
    if (effect.stat === "DF") return { id: "substituteDf", limit: 150 };
  }
  if (is(effect, "tacticCooldown") && scoped(effect, ["self", "team"])) {
    return { id: "tacticCooldown", limit: -50 };
  }
  if (is(effect, "AT", "matchTimeHalfFirst")) return { id: "firstHalfAt", limit: 30 };
  if (is(effect, "DF", "matchTimeHalfSecond")) return { id: "secondHalfDf", limit: 30 };
  return null;
}

export function clampPassiveTotal(raw: number, limit: number): number {
  return limit < 0 ? Math.max(raw, limit) : Math.min(raw, limit);
}
