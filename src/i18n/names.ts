import type { Ability, Player } from "@/domain/types";
import type { Locale } from "./locales";

/**
 * Pick the name to show for a player, given the "original names" toggle.
 * `nameOriginal` is the game's romanised Japanese form (Endo Mamoru); `name`
 * is the localised Western form (Mark Evans) in the en/fr builds.
 */
export function playerDisplayName(
  player: Pick<Player, "name" | "nameOriginal"> | null | undefined,
  showOriginalNames: boolean,
): string {
  if (!player) return "";
  if (showOriginalNames && player.nameOriginal) return player.nameOriginal;
  return player.name;
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
  return (
    ability.names?.[locale] ||
    ability.names?.en ||
    ability.names?.fr ||
    ability.names?.ja ||
    ability.name ||
    ability.id
  );
}
