/**
 * Best-effort parser: English passive text → structured effects for the
 * synergy engine. Coverage is intentionally partial — charge-rank loops,
 * save rate, dash knockback, etc. stay empty rather than invent a fake model.
 *
 * Prefer EN over FR: grammar is more regular ("Team AT +4% for the first half").
 */

import {
  type PassiveCondition,
  type PassiveEffect,
  type PassiveScope,
  type PassiveStat,
} from "./types";

/** More specific patterns first. */
const STAT_RULES: { re: RegExp; stat: PassiveStat }[] = [
  { re: /direct\s*shot\s*at/i, stat: "directShotAT" },
  { re: /shot\s*at/i, stat: "shotAT" },
  { re: /wall\s*pierce/i, stat: "wallPierce" },
  { re: /wall\s*df|wall\s*def/i, stat: "wallDF" },
  { re: /focus\s*at\s*&\s*df|focus\s*at\s*and\s*df/i, stat: "focus" },
  { re: /scramble\s*at\s*&\s*df|scramble\s*at\s*and\s*df/i, stat: "scramble" },
  { re: /rough\s*attack\s*at\s*&\s*df|rough\s*attack\s*at\s*and\s*df/i, stat: "roughAttack" },
  { re: /rough\s*attack/i, stat: "roughAttack" },
  { re: /special\s*tactics?\s*cooldown|tactic(?:s)?\s*cooldown/i, stat: "tacticCooldown" },
  { re: /bond\s*power\s*loss|bond\s*loss/i, stat: "bondLoss" },
  { re: /bond\s*power|bond\s*gain/i, stat: "bondGain" },
  { re: /breach\s*tension/i, stat: "breachTensionRequirement" },
  { re: /breach\s*rate/i, stat: "breachRate" },
  { re: /foul\s*rate/i, stat: "foulRate" },
  { re: /common\s*drop|drop\s*rate\s*\(common\)/i, stat: "commonDropRate" },
  { re: /rare\s*drop|drop\s*rate\s*\(rare\)/i, stat: "rareDropRate" },
  { re: /drop\s*rate/i, stat: "commonDropRate" },
  { re: /\bat\s*&\s*df\b|\bat\s*and\s*df\b/i, stat: "all" },
  { re: /\bkp\b|kick\s*power/i, stat: "KP" },
  { re: /\btension\b/i, stat: "tension" },
  // Lone AT / DF after more specific patterns failed.
  { re: /\bteam\s*at\b|(?<![a-z])at(?!\s*&\s*df)(?!\s*and\s*df)\b/i, stat: "AT" },
  { re: /\bteam\s*df\b|(?<![a-z])df(?!\s*&\s*at)\b/i, stat: "DF" },
];

const CONDITION_RULES: { re: RegExp; cond: PassiveCondition }[] = [
  { re: /first\s*half/i, cond: "matchTimeHalfFirst" },
  { re: /second\s*half/i, cond: "matchTimeHalfSecond" },
  {
    re: /20\s*%\s*or\s*more\s*bond|bond\s*power.*20\s*%|at\s*20\s*%\s*or\s*more\s*bond/i,
    cond: "bondPowerAtLeast20",
  },
  { re: /tension.*(?:50|fifty)\s*%|(?:50|fifty)\s*%.*tension/i, cond: "tensionAtLeast50" },
  { re: /tension.*100|at\s*100\s*%\s*tension|100\s*%\s*tension/i, cond: "tensionAt100" },
  { re: /own\s*half|your\s*half/i, cond: "fieldZoneOwnHalf" },
  { re: /opponent'?s?\s*half|opposition\s*half/i, cond: "fieldZoneOpponentHalf" },
  { re: /outside\s*(?:the\s*)?zone/i, cond: "outsideZoneArea" },
  { re: /same\s*element.*nearby|nearby.*same\s*element/i, cond: "sameElementAllyNearby" },
  {
    re: /different\s*element.*nearby|nearby.*different\s*element/i,
    cond: "differentElementAllyNearby",
  },
  { re: /after\s*(?:a\s*)?pass|when\s*making\s*a\s*pass|on\s*team\s*pass/i, cond: "onTeamPass" },
  { re: /after\s*(?:a\s*)?substitution|after\s*subbing/i, cond: "afterSubstitution" },
  {
    re: /winning\s*(?:a\s*)?(?:focus|scramble)|focus\s*or\s*scramble\s*(?:battle\s*)?victory|when\s*winning\s*a\s*focus\s*or\s*scramble/i,
    cond: "whenWinningFocusOrScramble",
  },
  { re: /while\s*dashing|on\s*dash(?!\s*knockback)/i, cond: "whileDashing" },
  { re: /breach\s*rate.*15|15\s*%.*breach/i, cond: "teamBreachRateAtLeast15" },
  { re: /not\s*leading|score\s*not\s*leading/i, cond: "scoreNotLeading" },
  { re: /no\s*foul|without\s*(?:a\s*)?foul|no\s*foul\s*committed/i, cond: "noFoulCommittedYet" },
  {
    re: /opposition\s*commits?\s*a\s*foul|opponent\s*foul|when\s*the\s*opposition\s*commits/i,
    cond: "onOpponentFoul",
  },
  { re: /lost\s*(?:a\s*)?scramble|on\s*lost\s*scramble/i, cond: "onLostScramble" },
  { re: /ball\s*recovery|after\s*recovering/i, cond: "afterBallRecoveryNoDirectCatch" },
  { re: /next\s*rough\s*attack/i, cond: "nextRoughAttackOnly" },
  { re: /marked\s*or\s*blocked.*dash|dash.*marked/i, cond: "onMarkedOrBlockedWhileDashing" },
  { re: /opponent\s*pass.*focus|pass\s*during\s*focus/i, cond: "onOpponentPassDuringFocus" },
];

function parseStat(text: string): PassiveStat | null {
  for (const { re, stat } of STAT_RULES) {
    if (re.test(text)) return stat;
  }
  return null;
}

function parseScope(text: string): PassiveScope {
  // Order: situational scopes before generic team/self.
  if (
    /subbed(?:-|\s)?(?:on|in)|upon\s*being\s*subbed|after\s*(?:a\s*)?substitution|player\s*coming\s*on|entering\s*player/i.test(
      text,
    )
  ) {
    return "subbedOnPlayer";
  }
  if (/nearby|close\s*by/i.test(text)) return "nearbyAllies";
  if (/same\s*element/i.test(text) && /player|ally|allies|for\s*players/i.test(text)) {
    return "alliesSameElement";
  }
  if (/different\s*element/i.test(text) && /player|ally|allies|for\s*players/i.test(text)) {
    return "alliesDifferentElement";
  }
  if (/same\s*position/i.test(text)) return "alliesSamePosition";
  if (/different\s*position/i.test(text)) return "alliesDifferentPosition";
  if (/\ballied\s*gk\b|\bgk\s*allies\b|for\s*(?:the\s*)?gk\b/i.test(text)) return "alliedGK";
  if (/\ballied\s*df\b|for\s*(?:the\s*)?df\b/i.test(text) && !/wall\s*df/i.test(text)) {
    return "alliedDF";
  }
  if (/\ballied\s*mf\b|for\s*(?:the\s*)?mf\b/i.test(text)) return "alliedMF";

  // "Own …" / personal usually means the carrier.
  if (
    /\bown\b|\bpersonal\b|\(perso\)|\bself\b|\bcarrier\b|\bthis\s*player\b/i.test(text) &&
    !/\bteam\b/i.test(text)
  ) {
    return "self";
  }
  if (/\bteam\b/i.test(text)) return "team";
  if (/\bown\b|\bpersonal\b|\(perso\)/i.test(text)) return "self";
  return "team";
}

function parseConditions(text: string): PassiveCondition[] {
  const out: PassiveCondition[] = [];
  for (const { re, cond } of CONDITION_RULES) {
    if (re.test(text) && !out.includes(cond)) out.push(cond);
  }
  return out;
}

function parseDirection(text: string): "increase" | "decrease" {
  // Prefer the sign attached to the magnitude: "… +4%" vs "… -16%".
  const signed = text.match(/([+\-−－])\s*\d+(?:\.\d+)?\s*%/);
  if (signed) {
    return signed[1] === "+" ? "increase" : "decrease";
  }
  if (/\bcooldown\b.*[+\-−－]|\b[+\-−－].*\bcooldown\b/i.test(text) && /[−\-－]/.test(text)) {
    return "decrease";
  }
  if (/\bfoul\s*rate\b/i.test(text) && /[−\-－]/.test(text) && !/\+/.test(text)) {
    return "decrease";
  }
  if (/\bbond\s*(?:power\s*)?loss\b/i.test(text)) return "decrease";
  return "increase";
}

/**
 * Parse one English passive blurb into zero or more effects.
 * Empty array = leave the passive text-only (engine ignores it).
 */
export function parsePassiveEffectsFromEn(text: string): PassiveEffect[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];

  const stat = parseStat(cleaned);
  if (!stat) return [];

  // Skip patterns we know we model poorly (charge-rank loops, unmapped gauges).
  if (/charge\s*rank|for\s*each\s*charge|build\s*charge/i.test(cleaned)) return [];
  if (/\bsave\s*rate\b/i.test(cleaned)) return [];
  if (/dash\s*knockback/i.test(cleaned) && !parseStat(cleaned.replace(/dash\s*knockback/i, ""))) {
    // Bond power on dash knockback still has a stat; keep if bondGain matched.
  }

  return [
    {
      scope: parseScope(cleaned),
      stat,
      mode: "percent",
      direction: parseDirection(cleaned),
      conditions: parseConditions(cleaned),
    },
  ];
}
