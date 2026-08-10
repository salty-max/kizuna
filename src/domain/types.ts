import type { BaseStats, PowerKey } from "./stats";

export const POSITIONS = ["GK", "DF", "MF", "FW"] as const;
export type Position = (typeof POSITIONS)[number];

export const ELEMENTS = ["Fire", "Wind", "Forest", "Mountain"] as const;
export type Element = (typeof ELEMENTS)[number];

export const ROLES = ["Player", "Manager", "Coordinator", "Coach"] as const;
export type Role = (typeof ROLES)[number];

/**
 * Build archetypes. The upstream dataset spells these two different ways —
 * `Affinity` on a character reads "Brecha"/"RoughPlay", while `buildType` on a
 * passive reads "Breach"/"Rough Play". They are the same six things, so the
 * pipeline normalises both onto this one set; matching a character to a passive
 * archetype is otherwise impossible.
 */
export const BUILD_TYPES = [
  "breach",
  "tension",
  "counter",
  "bond",
  "roughPlay",
  "justice",
] as const;
export type BuildType = (typeof BUILD_TYPES)[number];

export const BUILD_TYPE_LABELS: Record<BuildType, string> = {
  breach: "Breach",
  tension: "Tension",
  counter: "Counter",
  bond: "Bond",
  roughPlay: "Rough Play",
  justice: "Justice",
};

/**
 * Rarity ladder. A character is acquired at some rarity and ascended up it —
 * except Hero and Basara, which are separate acquisitions rather than upgrades.
 * Rarity scales every base stat.
 *
 * Order is load-bearing: the share encoding stores a rarity's index, so new
 * tiers go on the end and existing ones never move.
 */
export const RARITIES = [
  "common",
  "rising",
  "advanced",
  "top",
  "legendary",
  "hero",
  "basara",
] as const;
export type Rarity = (typeof RARITIES)[number];

export interface RarityScale {
  /** Multiplies the dataset's Common-rarity stat line. */
  multiplier: number;
  /** Added per stat *after* the multiplier. */
  flatBonus: number;
  /** True when the figures are inferred rather than measured — surfaced in the UI. */
  estimated: boolean;
}

/**
 * The first six multipliers are the community's *tested* values, not the "+20%
 * of Common per rank" figure several guides quote (which would give
 * 1.2/1.4/1.6/1.8). The two disagree; measured beats stated.
 *
 * Basara is an estimate and flagged as such. No tested multiplier exists for
 * it — what is reported is that a Basara comes out 30–40 total points above the
 * Hero version of the same character, so it is modelled as Hero plus a flat +5
 * per stat (7 × 5 = +35, the middle of that range). Revise here if better
 * numbers turn up.
 */
export const RARITY_SCALES: Record<Rarity, RarityScale> = {
  common: { multiplier: 1, flatBonus: 0, estimated: false },
  rising: { multiplier: 1.1, flatBonus: 0, estimated: false },
  advanced: { multiplier: 1.2, flatBonus: 0, estimated: false },
  top: { multiplier: 1.3, flatBonus: 0, estimated: false },
  legendary: { multiplier: 1.4, flatBonus: 0, estimated: false },
  hero: { multiplier: 1.67, flatBonus: 0, estimated: false },
  basara: { multiplier: 1.67, flatBonus: 5, estimated: true },
};

export const RARITY_LABELS: Record<Rarity, string> = {
  common: "Common",
  rising: "Rising",
  advanced: "Advanced",
  top: "Top",
  legendary: "Legendary",
  hero: "Hero",
  basara: "Basara",
};

/**
 * Squad limits the game enforces. Worth checking in a builder: a squad that
 * cannot legally exist is worse than useless.
 */
export const MAX_HERO_STARTERS = 2;
export const MAX_BASARA_IN_SQUAD = 1;

/**
 * Hero comes in three colours, and the colour is not a choice — it follows the
 * character's build archetype. So the variant is derived rather than asked for,
 * which also makes an invalid Hero/archetype pairing unrepresentable.
 */
export const HERO_VARIANTS = ["red", "silver", "pink"] as const;
export type HeroVariant = (typeof HERO_VARIANTS)[number];

const HERO_VARIANT_BY_BUILD: Record<BuildType, HeroVariant> = {
  tension: "red",
  roughPlay: "red",
  justice: "silver",
  bond: "silver",
  breach: "pink",
  counter: "pink",
};

export const HERO_VARIANT_LABELS: Record<HeroVariant, string> = {
  red: "Hero rouge",
  silver: "Hero argent",
  pink: "Hero rose",
};

/** `null` when the character's archetype is unknown in the dataset. */
export function heroVariantFor(buildType: BuildType | null): HeroVariant | null {
  return buildType ? HERO_VARIANT_BY_BUILD[buildType] : null;
}

export interface Player {
  id: number;
  name: string;
  nickname: string;
  /** Path under the character CDN; see `imageUrl()`. */
  image: string;
  game: string;
  position: Position;
  element: Element;
  /** `null` where the dataset says "Unknown" or omits it. */
  buildType: BuildType | null;
  role: Role;
  gender: string;
  ageGroup: string;
  year: string;
  stats: BaseStats;
  total: number;
}

/** Loaded on demand — the long-form text is ~90% of the raw dataset by size. */
export interface PlayerDetails {
  id: number;
  description: string;
  howToObtain: string;
  inazugleLink: string;
}

export const EQUIPMENT_SLOTS = ["boots", "pendant", "bracelet", "misc"] as const;
export type EquipmentSlot = (typeof EQUIPMENT_SLOTS)[number];

export const EQUIPMENT_SLOT_LABELS: Record<EquipmentSlot, string> = {
  boots: "Boots",
  pendant: "Pendant",
  bracelet: "Bracelet",
  misc: "Accessory",
};

export interface Equipment {
  id: string;
  slot: EquipmentSlot;
  name: string;
  shop: string;
  /** Flat additions to base stats; absent stats are simply 0. */
  stats: Partial<BaseStats>;
  total: number;
  /**
   * Icon scraped from Inazugle and joined by name — absent for the ~14% of
   * items whose name differs between the two sources.
   */
  image?: string;
}

export const ABILITY_TYPES = ["Shoot", "Dribble", "Block", "Catch", "Skill"] as const;
export type AbilityType = string;

export interface Ability {
  id: string;
  name: string;
  type: AbilityType;
  element: Element | null;
  power: number;
  tension: number;
  extra: string;
  shop: string;
}

/* ── Passives ─────────────────────────────────────────────────────────────── */

export const PASSIVE_SOURCES = ["player", "custom", "manager", "coordinator"] as const;
export type PassiveSource = (typeof PASSIVE_SOURCES)[number];

/** Who an effect reaches. Resolved against the squad by the synergy engine. */
export const PASSIVE_SCOPES = [
  "self",
  "team",
  "alliesSameElement",
  "alliesDifferentElement",
  "alliesSamePosition",
  "alliesDifferentPosition",
  "alliedGK",
  "alliedDF",
  "alliedMF",
  "nearbyAllies",
  "subbedOnPlayer",
] as const;
export type PassiveScope = (typeof PASSIVE_SCOPES)[number];

/**
 * Every stat a passive can touch. Some map onto the derived power stats and are
 * therefore computable per player; the rest are team-level gauges we can only
 * total up and display. `POWER_STAT_MAP` below is what draws that line.
 */
export const PASSIVE_STATS = [
  "shotAT",
  "focus",
  "scramble",
  "wallDF",
  "AT",
  "DF",
  "KP",
  "all",
  "directShotAT",
  "wallPierce",
  "bondGain",
  "bondLoss",
  "tension",
  "breachRate",
  "breachTensionRequirement",
  "roughAttack",
  "foulRate",
  "tacticCooldown",
  "commonDropRate",
  "rareDropRate",
] as const;
export type PassiveStat = (typeof PASSIVE_STATS)[number];

/**
 * Passive stats that resolve to concrete power stats. Anything not listed here
 * is a gauge (tension, breach rate, drop rates…) with no per-player number.
 */
export const POWER_STAT_MAP: Partial<Record<PassiveStat, readonly PowerKey[]>> = {
  shotAT: ["shootAT"],
  focus: ["focusAT", "focusDF"],
  scramble: ["scrambleAT", "scrambleDF"],
  wallDF: ["wallDF"],
  AT: ["shootAT", "focusAT", "scrambleAT"],
  DF: ["focusDF", "scrambleDF", "wallDF"],
  KP: ["kp"],
  all: ["shootAT", "focusAT", "scrambleAT", "focusDF", "scrambleDF", "wallDF"],
};

export const PASSIVE_CONDITIONS = [
  "afterBallRecoveryNoDirectCatch",
  "afterSubstitution",
  "bondPowerAtLeast20",
  "differentElementAllyNearby",
  "distanceWithinRadius",
  "fieldZoneOpponentHalf",
  "fieldZoneOwnHalf",
  "matchTimeHalfFirst",
  "matchTimeHalfSecond",
  "nextRoughAttackOnly",
  "noFoulCommittedYet",
  "onLostScramble",
  "onMarkedOrBlockedWhileDashing",
  "onOpponentFoul",
  "onOpponentPassDuringFocus",
  "onTeamPass",
  "outsideZoneArea",
  "sameElementAllyNearby",
  "scoreNotLeading",
  "teamBreachRateAtLeast15",
  "tensionAt100",
  "tensionAtLeast50",
  "whenWinningFocusOrScramble",
  "whileDashing",
] as const;
export type PassiveCondition = (typeof PASSIVE_CONDITIONS)[number];

export interface PassiveEffect {
  scope: PassiveScope;
  stat: PassiveStat;
  mode: "percent";
  direction: "increase" | "decrease";
  conditions: PassiveCondition[];
}

export interface Passive {
  id: string;
  number: number;
  source: PassiveSource;
  buildType: BuildType | null;
  description: string;
  /** Reference bounds only — the in-game value depends on the passive's level. */
  strongValue: number;
  weakValue: number;
  effects: PassiveEffect[];
}

/** Everything the app loads once at boot. */
export interface Dataset {
  players: Player[];
  passives: Passive[];
  equipment: Equipment[];
  abilities: Ability[];
  games: string[];
  imageBase: string;
  generatedAt: string;
}
