/**
 * The two stat layers of Victory Road.
 *
 * Players carry seven *base* stats. What actually resolves a duel on the pitch
 * are the *power* stats derived from them — and it is the power stats that
 * passives modify, never the base ones. Keeping the two apart is the whole
 * reason the synergy engine can say anything meaningful.
 */

export const STAT_KEYS = [
  "kick",
  "control",
  "technique",
  "pressure",
  "physical",
  "agility",
  "intelligence",
] as const;

export type StatKey = (typeof STAT_KEYS)[number];
export type BaseStats = Record<StatKey, number>;

export const STAT_LABELS: Record<StatKey, string> = {
  kick: "Kick",
  control: "Control",
  technique: "Technique",
  pressure: "Pressure",
  physical: "Physical",
  agility: "Agility",
  intelligence: "Intelligence",
};

export const POWER_KEYS = [
  "shootAT",
  "focusAT",
  "focusDF",
  "wallDF",
  "scrambleAT",
  "scrambleDF",
  "kp",
] as const;

export type PowerKey = (typeof POWER_KEYS)[number];
export type PowerStats = Record<PowerKey, number>;

export const POWER_LABELS: Record<PowerKey, string> = {
  shootAT: "Shoot AT",
  focusAT: "Focus AT",
  focusDF: "Focus DF",
  wallDF: "Wall DF",
  scrambleAT: "Scramble AT",
  scrambleDF: "Scramble DF",
  kp: "KP",
};

/** Shown in the UI so a number is never unexplained. */
export const POWER_FORMULAS: Record<PowerKey, string> = {
  shootAT: "Kick + Control",
  focusAT: "Technique + Control + Kick×0.5",
  focusDF: "Technique + Intelligence + Agility×0.5",
  wallDF: "Pressure + Physical",
  scrambleAT: "Intelligence + Physical",
  scrambleDF: "Intelligence + Pressure",
  kp: "Pressure×2 + Physical×3 + Agility×4",
};

export function emptyBaseStats(): BaseStats {
  return {
    kick: 0,
    control: 0,
    technique: 0,
    pressure: 0,
    physical: 0,
    agility: 0,
    intelligence: 0,
  };
}

export function emptyPowerStats(): PowerStats {
  return {
    shootAT: 0,
    focusAT: 0,
    focusDF: 0,
    wallDF: 0,
    scrambleAT: 0,
    scrambleDF: 0,
    kp: 0,
  };
}

export function addBaseStats(a: BaseStats, b: Partial<BaseStats>): BaseStats {
  const out = { ...a };
  for (const key of STAT_KEYS) out[key] += b[key] ?? 0;
  return out;
}

export function totalOf(stats: BaseStats): number {
  return STAT_KEYS.reduce((sum, key) => sum + stats[key], 0);
}

export function computePower(stats: BaseStats): PowerStats {
  return {
    shootAT: Math.round(stats.kick + stats.control),
    focusAT: Math.round(stats.technique + stats.control + stats.kick * 0.5),
    focusDF: Math.round(stats.technique + stats.intelligence + stats.agility * 0.5),
    wallDF: Math.round(stats.pressure + stats.physical),
    scrambleAT: Math.round(stats.intelligence + stats.physical),
    scrambleDF: Math.round(stats.intelligence + stats.pressure),
    kp: Math.round(stats.pressure * 2 + stats.physical * 3 + stats.agility * 4),
  };
}
