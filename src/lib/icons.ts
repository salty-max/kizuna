/**
 * Paths under `public/icons/`, filled by `bun run data` from `data/raw/icons/`.
 *
 * File names follow the game's own atlas labels. Forest is `wood` in the source
 * files; rough play is `rough_play`. Position badges are localised — the app
 * Position badge language follows the active UI locale (fr / en / ja).
 */

import type { AuraType, BuildType, Element, Gender, Position } from "@/domain/types";
import type { Locale } from "@/i18n";

export function iconUrl(path: string): string {
  return `${import.meta.env.BASE_URL}icons/${path.replace(/^\//, "")}`;
}

/* ── Elements ─────────────────────────────────────────────────────────────── */

export const ELEMENT_ICON: Record<Element, string> = {
  Fire: "elements/icon_element_fire.png",
  Wind: "elements/icon_element_wind.png",
  Forest: "elements/icon_element_wood.png",
  Mountain: "elements/icon_element_mountain.png",
};

/* ── Positions ────────────────────────────────────────────────────────────── */

const POSITION_FILE: Record<Position, "gk" | "def" | "mid" | "fwd"> = {
  GK: "gk",
  DF: "def",
  MF: "mid",
  FW: "fwd",
};

/** Coloured text badge from the localised atlas (GAR / DÉF / MIL / ATT in FR). */
export function positionBadgePath(position: Position, lang: Locale = "fr"): string {
  return `positions/icon_position_${POSITION_FILE[position]}.${lang}.png`;
}

/** Older plain-white pictogram — denser for 16–18px slots on pitch cards. */
export function positionSilhouettePath(position: Position): string {
  return `positions/icon_position_${POSITION_FILE[position]}_silhouette.png`;
}

export const STAFF_ICON = {
  manager: "positions/icon_position_manager.png",
  coach: "positions/icon_position_coach.png",
} as const;

/* ── Build styles / archetypes ────────────────────────────────────────────── */

export const STYLE_ICON: Record<BuildType, string> = {
  breach: "styles/icon_style_breach.png",
  tension: "styles/icon_style_tension.png",
  counter: "styles/icon_style_counter.png",
  bond: "styles/icon_style_bond.png",
  roughPlay: "styles/icon_style_rough_play.png",
  justice: "styles/icon_style_justice.png",
};

/* ── Hissatsu categories ──────────────────────────────────────────────────── */

export const HISSATSU_ICON: Record<string, string> = {
  Shoot: "hissatsu/icon_hissatsu_shoot.png",
  Dribble: "hissatsu/icon_hissatsu_dribble.png",
  Block: "hissatsu/icon_hissatsu_block.png",
  Catch: "hissatsu/icon_hissatsu_catch.png",
};

/* ── Gender (male / female only — Neutral has no atlas glyph) ─────────────── */

export const GENDER_ICON: Partial<Record<Gender, string>> = {
  Male: "gender/icon_gender_male.png",
  Female: "gender/icon_gender_female.png",
};

/**
 * Aura badges, by mechanic.
 *
 * The eight mechanics come from the game's id prefixes and are certain; it is
 * the badge assignment that is inferred, with graded confidence recorded in
 * `data/raw/icons/aura/_aura_types.csv` — strong for mixi max / armed / keshin,
 * weak for totem and mode change. `awakening_change` (a single aura) has no
 * badge left, hence the missing entry: the component then renders nothing
 * rather than borrowing another mechanic's glyph.
 */
export const AURA_ICON: Partial<Record<AuraType, string>> = {
  keshin: "aura/icon_aura_keshin.png",
  armed: "aura/icon_aura_armed.png",
  mixi_max: "aura/icon_aura_mixi_max.png",
  totem: "aura/icon_aura_totem.png",
  bond_transform: "aura/icon_aura_bond_transform.png",
  awakening_power: "aura/icon_aura_awakening_power.png",
  mode_change: "aura/icon_aura_mode_change.png",
};

/* ── Tactics (string_id → file) ───────────────────────────────────────────── */

export function tacticIconPath(stringId: string): string {
  // Collapse situational `_st…` reskins onto the base glyph.
  const base = stringId.split("_st")[0]!;
  return `tactics/icon_tactic_${base}.png`;
}

/* ── Passives (unlabelled atlas cells — index only) ───────────────────────── */

export function passiveIconPath(index: number): string {
  return `passives/icon_passive_${String(index).padStart(3, "0")}.png`;
}
