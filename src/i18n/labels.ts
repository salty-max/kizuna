/**
 * Domain-enum → message key helpers. Keep enum ids stable; only the catalogue
 * strings move between languages.
 */

import type { Formation } from "@/domain/formations";
import type { PowerKey, StatKey } from "@/domain/stats";
import type { RuleNotice, ScopeNote, UnresolvedReason, Violation } from "@/domain/synergy";
import {
  heroVariantFor,
  type AuraType,
  type BuildType,
  type Element,
  type EquipmentSlot,
  type Gender,
  type HeroVariant,
  type PassiveCondition,
  type PassiveScope,
  type PassiveStat,
  type Rarity,
} from "@/domain/types";
import type { MessageKey, Translator } from "./translate";

/** Localised formation name (`formations.{id}`), with English fallback. */
export function formationLabel(
  t: Translator["t"],
  formation: Pick<Formation, "id" | "name">,
): string {
  const key = `formations.${formation.id}` as MessageKey;
  const label = t(key);
  return label.startsWith("formations.") ? formation.name : label;
}

/**
 * Short series tag so same-name roster variants (IE1 vs GO vs Ares…) stay
 * distinguishable in lists without reading the full series string.
 */
export function seriesShortLabel(game: string): string {
  const g = game.trim();
  if (!g) return "";
  if (/Victory Road/i.test(g)) return "VR";
  if (/Orion/i.test(g)) return "Orion";
  if (/Arès|Ares/i.test(g)) return "Ares";
  if (/Galaxy/i.test(g)) return "Galaxy";
  if (/GO\s*2|Chrono/i.test(g)) return "GO2";
  if (/\bGO\b/i.test(g)) return "GO";
  if (/\b3\b/.test(g) && /Eleven/i.test(g)) return "IE3";
  if (/\b2\b/.test(g) && /Eleven/i.test(g)) return "IE2";
  if (/Inazuma Eleven/i.test(g)) return "IE1";
  return g;
}

/** Localised hissatsu category label (Shoot / Dribble / … / Aura). */
export function abilityTypeLabel(t: Translator["t"], type: string): string {
  const key = `editor.abilityTypes.${type}` as MessageKey;
  const label = t(key);
  // Missing key falls back to the raw type rather than the dotted path.
  return label.startsWith("editor.abilityTypes.") ? type : label;
}

/** Aura mechanic: keshin, armed, mixi max… */
export function auraTypeLabel(t: Translator["t"], type: AuraType): string {
  return t(`editor.auraTypes.${type}` as MessageKey);
}

export function elementLabel(t: Translator["t"], element: Element): string {
  return t(`elements.${element}` as MessageKey);
}

export function genderLabel(t: Translator["t"], gender: Gender): string {
  return t(`genders.${gender}` as MessageKey);
}

export function rarityLabelKey(t: Translator["t"], rarity: Rarity): string {
  return t(`rarities.${rarity}` as MessageKey);
}

function heroVariantLabel(t: Translator["t"], variant: HeroVariant): string {
  return t(`heroVariants.${variant}` as MessageKey);
}

/** Full rarity label, resolving Hero to its colour variant when known. */
export function rarityDisplayLabel(
  t: Translator["t"],
  rarity: Rarity,
  buildType: BuildType | null,
): string {
  if (rarity !== "hero") return rarityLabelKey(t, rarity);
  const variant = heroVariantFor(buildType);
  return variant ? heroVariantLabel(t, variant) : rarityLabelKey(t, "hero");
}

export function buildTypeLabel(t: Translator["t"], buildType: BuildType): string {
  return t(`buildTypes.${buildType}` as MessageKey);
}

export function equipmentSlotLabel(t: Translator["t"], slot: EquipmentSlot): string {
  return t(`equipmentSlots.${slot}` as MessageKey);
}

export function statLabel(t: Translator["t"], key: StatKey): string {
  return t(`stats.${key}` as MessageKey);
}

export function powerLabel(t: Translator["t"], key: PowerKey): string {
  return t(`power.${key}` as MessageKey);
}

export function powerFormula(t: Translator["t"], key: PowerKey): string {
  return t(`powerFormulas.${key}` as MessageKey);
}

export function passiveStatLabel(t: Translator["t"], stat: PassiveStat): string {
  return t(`passiveStats.${stat}` as MessageKey);
}

export function scopeLabel(t: Translator["t"], scope: PassiveScope): string {
  return t(`scopes.${scope}` as MessageKey);
}

export function directionLabel(t: Translator["t"], direction: "increase" | "decrease"): string {
  return t(`directions.${direction}` as MessageKey);
}

export function conditionLabel(t: Translator["t"], condition: PassiveCondition): string {
  return t(`conditions.${condition}` as MessageKey);
}

export function unresolvedReasonLabel(t: Translator["t"], reason: UnresolvedReason): string {
  return t(`unresolved.${reason}` as MessageKey);
}

export function scopeNoteLabel(t: Translator["t"], note: ScopeNote): string {
  return t(`notes.${note}` as MessageKey);
}

export function violationLabel(t: Translator["t"], violation: Violation): string {
  return t(`violations.${violation.code}` as MessageKey, {
    count: violation.count,
    max: violation.max,
    name: "name" in violation ? violation.name : "",
  });
}

export function ruleNoticeLabel(t: Translator["t"], notice: RuleNotice): string {
  return t(`ruleNotices.${notice.code}` as MessageKey, {
    required: notice.required,
  });
}
