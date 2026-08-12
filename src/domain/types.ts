import type { BaseStats, PowerKey } from "./stats";

export const POSITIONS = ["GK", "DF", "MF", "FW"] as const;
export type Position = (typeof POSITIONS)[number];

export const ELEMENTS = ["Fire", "Wind", "Forest", "Mountain"] as const;
export type Element = (typeof ELEMENTS)[number];

export const ROLES = ["Player", "Coach", "Manager"] as const;
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
 * Intermediate rarities (Rising→Legendary) still use the community's *tested*
 * multipliers on the Common stat line — the dataminer only ships Common, Hero
 * and Basara tables.
 *
 * Hero and Basara fall back to these ratios only when a character has no real
 * table row. The ratios (~1.206× / ~1.444×) are the mean of every stat on every
 * character that *does* have a real row in build 6.00.23.00; stdev is <0.02 so
 * they are a tight fit, not the old 1.67 guess that applied to a different
 * (community-scrape) reference line.
 */
export const RARITY_SCALES: Record<Rarity, RarityScale> = {
  common: { multiplier: 1, flatBonus: 0, estimated: false },
  rising: { multiplier: 1.1, flatBonus: 0, estimated: false },
  advanced: { multiplier: 1.2, flatBonus: 0, estimated: false },
  top: { multiplier: 1.3, flatBonus: 0, estimated: false },
  legendary: { multiplier: 1.4, flatBonus: 0, estimated: false },
  hero: { multiplier: 1.206, flatBonus: 0, estimated: true },
  basara: { multiplier: 1.444, flatBonus: 0, estimated: true },
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

/** Levelled stat lines the dataminer ships for Hero / Basara forms. */
export interface RarityStats {
  lv50: BaseStats;
  lv99: BaseStats;
}

export interface Player {
  id: number;
  name: string;
  /** Game's "show original names" field (e.g. Endo Mamoru). */
  nameOriginal: string;
  /** Same as nameOriginal when it differs from name; otherwise empty. */
  nickname: string;
  /** Path under the Inazugle CDN (`imageBase`); empty when no portrait joined. */
  image: string;
  /** Series label from the game (`Inazuma Eleven`, `… Victory Road`, …). */
  game: string;
  team: string;
  position: Position;
  /** Secondary position when the game records one different from `position`. */
  altPosition: Position | null;
  element: Element;
  /** From the game's style code; overridable per slot. */
  buildType: BuildType | null;
  role: Role;
  gender: string;
  ageGroup: string;
  year: string;
  /** Common rarity, level 99 — the default build target. */
  stats: BaseStats;
  /** Common rarity, level 50. */
  statsLv50: BaseStats;
  total: number;
  /** Real Hero table when the character has a Hero form; else null. */
  heroStats: RarityStats | null;
  /** Real Basara table when the character has a Basara form; else null. */
  basaraStats: RarityStats | null;
  /**
   * Les six techniques du tronc commun, apprises aux niveaux 1/13/20/30/38/43.
   * Elles ne se choisissent pas : le personnage les apprend.
   */
  skills: LearnedSkill[];
  /**
   * La seconde branche — trois techniques aux mêmes niveaux 30/38/43 que la
   * queue de `skills`. Ce ne sont pas des slots en plus : c'est l'alternative.
   * Le seul vrai choix de build sur les techniques.
   */
  skillsAlt: LearnedSkill[];
  /** Techniques de la forme Hero, quand elle existe. Sans branche alternative. */
  heroSkills: SkillSet | null;
  /** Techniques de la forme Basara, quand elle existe. */
  basaraSkills: SkillSet | null;
}

/** Loaded on demand — descriptions sit in lazy buckets so boot stays light. */
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
  /** Game string id (`eq_sh071101`), stable across languages. */
  id: string;
  slot: EquipmentSlot;
  name: string;
  description: string;
  shop: string;
  /** Flat additions to base stats; absent stats are simply 0. */
  stats: Partial<BaseStats>;
  total: number;
  /**
   * Icon scraped from Inazugle and joined by English name — absent when the
   * scrape and the game disagree on spelling.
   */
  image?: string;
}

export const ABILITY_TYPES = ["Shoot", "Dribble", "Block", "Catch", "Skill"] as const;
export type AbilityType = string;

/**
 * D'où vient une technique. Le jeu la range dans trois tables distinctes, et
 * un slot de personnage peut pointer vers n'importe laquelle : deux tiers sont
 * des `hissatsu`, le reste des aura-hissatsu et surtout des **auras** (22 % à
 * elles seules). Ne lire que `hissatsu` perd un slot sur trois, en silence.
 */
export const ABILITY_KINDS = ["hissatsu", "auraHissatsu", "aura"] as const;
export type AbilityKind = (typeof ABILITY_KINDS)[number];

/**
 * Mécanique d'une aura, lue du préfixe de son `string_id` (`wk*` keshin,
 * `wa*` armed, `wmm*` mixi max, `ws*` totem, `wkt*` bond transform,
 * `wap*` awakening power). Les huit types sont certains ; c'est l'attribution
 * des badges qui est inférée — voir `data/raw/icons/aura/_aura_types.csv`.
 */
export const AURA_TYPES = [
  "keshin",
  "armed",
  "mixi_max",
  "totem",
  "bond_transform",
  "awakening_power",
  "mode_change",
  "awakening_change",
] as const;
export type AuraType = (typeof AURA_TYPES)[number];

/** Names keyed by app locale — filled at build from the three dataminer bundles. */
export type LocalizedNames = Partial<Record<"fr" | "en" | "ja", string>>;

export interface Ability {
  id: string;
  /**
   * Fallback name in the build language (`meta.lang`). Prefer `names[locale]`
   * at display time so switching the UI language actually renames techniques.
   */
  name: string;
  names: LocalizedNames;
  kind: AbilityKind;
  /**
   * Hissatsu category: Shoot / Dribble / Block / Catch, or `Aura` for spirit
   * entries (no category code in the game data).
   */
  type: AbilityType;
  /** Mécanique de l'aura ; `null` pour tout ce qui n'est pas une aura. */
  auraType: AuraType | null;
  element: Element | null;
  power: number;
  tension: number;
  extra: string;
  shop: string;
}

/** Une technique apprise à un niveau donné. */
export interface LearnedSkill {
  level: number;
  abilityId: string;
}

/**
 * Le jeu de techniques d'une forme donnée.
 *
 * Les techniques dépendent de la rareté, exactement comme les stats : sur les
 * 72 personnages présents à la fois dans `characters` et `heroes`, les 72 ont
 * des listes différentes. Un Hero n'a par ailleurs jamais de branche
 * alternative (147/147), là où personnages et Basaras en ont toujours une.
 */
export interface SkillSet {
  skills: LearnedSkill[];
  skillsAlt: LearnedSkill[];
}

/* ── Passives ─────────────────────────────────────────────────────────────── */

export const PASSIVE_SOURCES = ["player", "custom", "coach", "manager"] as const;
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

/** Team tactic (必殺タクティクス) — chosen on the squad, spent with TP in match. */
export interface Tactic {
  id: string;
  name: string;
  description: string;
  tpCost: number;
}

/**
 * Character bond / kizuna entry from the dataminer.
 *
 * Activates when every `members` player id is present in the squad (pitch or
 * bench). Descriptions are often empty in the dump — the name + roster is what
 * the UI shows.
 */
export interface BondSynergy {
  id: string;
  name: string;
  description: string;
  members: number[];
  memberNames: string[];
}

/** Everything the app loads once at boot. */
export interface Dataset {
  players: Player[];
  passives: Passive[];
  equipment: Equipment[];
  abilities: Ability[];
  tactics: Tactic[];
  synergies: BondSynergy[];
  games: string[];
  imageBase: string;
  generatedAt: string;
}

/** How many tactics a squad can prepare. */
export const MAX_TEAM_TACTICS = 3;
