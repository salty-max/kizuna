import type {
  Ability,
  BondSynergy,
  Equipment,
  LocalizedNames,
  Passive,
  Player,
  PlayerDetails,
  Tactic,
} from "@/domain/types";
import type { Locale } from "./locales";

/** Prefer active locale, then en → fr → ja → fallback. */
export function localizedText(
  map: LocalizedNames | null | undefined,
  locale: Locale,
  fallback = "",
): string {
  if (!map) return fallback;
  return map[locale] || map.en || map.fr || map.ja || fallback || "";
}

/**
 * Pick the name to show for a player, given the "original names" toggle.
 * `nameOriginal` is the game's romanised Japanese form (Endo Mamoru); `names`
 * holds Western/local forms per UI locale.
 */
export function playerDisplayName(
  player: Pick<Player, "name" | "names" | "nameOriginal"> | null | undefined,
  showOriginalNames: boolean,
  locale: Locale = "fr",
): string {
  if (!player) return "";
  if (showOriginalNames && player.nameOriginal) return player.nameOriginal;
  return localizedText(player.names, locale, player.name);
}

/**
 * Club name in the active UI locale. Falls back through en → fr → ja → the
 * build-time `team` string so a missing translation never blanks the row.
 */
export function teamDisplayName(
  player: Pick<Player, "team" | "teamNames"> | null | undefined,
  locale: Locale,
): string {
  if (!player) return "";
  return localizedText(player.teamNames, locale, player.team);
}

/**
 * Stable filter key for a player's club: `teamId` when present, else a
 * name-based fallback for the rare row without an id.
 */
export function teamFilterKey(player: Pick<Player, "teamId" | "team">): string | null {
  if (player.teamId != null) return String(player.teamId);
  if (player.team) return `n:${player.team}`;
  return null;
}

/** Whether `player` matches a filter value produced by {@link teamFilterKey}. */
export function matchesTeamFilter(
  player: Pick<Player, "teamId" | "team">,
  teamKey: string,
): boolean {
  if (player.teamId != null) return String(player.teamId) === teamKey;
  return player.team !== "" && teamKey === `n:${player.team}`;
}

/** Same toggle for contribution rows that carry both name forms. */
export function contributionPlayerName(
  contribution: {
    fromPlayerName: string | null;
    fromPlayerNameOriginal?: string | null;
  },
  showOriginalNames: boolean,
): string | null {
  if (showOriginalNames && contribution.fromPlayerNameOriginal) {
    return contribution.fromPlayerNameOriginal;
  }
  return contribution.fromPlayerName;
}

/** Initials for avatars — always derived from the *displayed* name. */
export function playerInitials(displayName: string): string {
  return displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase();
}

/**
 * Technique name in the active UI locale. Falls back through en → fr → ja →
 * the build-time `name` field → id, so a missing translation never blanks the row.
 */
export function abilityDisplayName(ability: Ability, locale: Locale): string {
  return localizedText(ability.names, locale, ability.name || ability.id);
}

export function abilityDisplayDescription(ability: Ability, locale: Locale): string {
  return localizedText(ability.descriptions, locale, ability.description);
}

export function equipmentDisplayName(item: Equipment, locale: Locale): string {
  return localizedText(item.names, locale, item.name);
}

export function equipmentDisplayDescription(item: Equipment, locale: Locale): string {
  return localizedText(item.descriptions, locale, item.description);
}

export function tacticDisplayName(tactic: Tactic, locale: Locale): string {
  return localizedText(tactic.names, locale, tactic.name);
}

export function tacticDisplayDescription(tactic: Tactic, locale: Locale): string {
  return localizedText(tactic.descriptions, locale, tactic.description);
}

export function passiveDisplayDescription(passive: Passive, locale: Locale): string {
  return localizedText(passive.descriptions, locale, passive.description);
}

export function bondDisplayName(bond: BondSynergy, locale: Locale): string {
  return localizedText(bond.names, locale, bond.name);
}

export function bondDisplayDescription(bond: BondSynergy, locale: Locale): string {
  return localizedText(bond.descriptions, locale, bond.description);
}

export function playerDetailDescription(
  details: Pick<PlayerDetails, "description" | "descriptions"> | null | undefined,
  locale: Locale,
): string {
  if (!details) return "";
  return localizedText(details.descriptions, locale, details.description);
}

/** Fold any localised field for search (matches query against every locale). */
export function localizedSearchBlob(map: LocalizedNames | null | undefined, fallback = ""): string {
  const parts = [fallback, map?.fr, map?.en, map?.ja].filter(Boolean);
  return parts.join("\n");
}
