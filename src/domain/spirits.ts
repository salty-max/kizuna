import type { Ability } from "./types";

/**
 * The link between a spirit and the move it puts in a character's hands.
 *
 * Read forwards it is one move per spirit; read backwards it is a list, because
 * two spirits can grant the same one (White Pawn and Black Pawn both give
 * Rat-a-Tat Pass).
 */

/** The move a spirit grants, or `null` — most auras grant none. */
export function grantedMove(
  ability: Ability,
  abilitiesById: ReadonlyMap<string, Ability>,
): Ability | null {
  if (!ability.grantsAbilityId) return null;
  return abilitiesById.get(ability.grantsAbilityId) ?? null;
}

/**
 * Every spirit that grants this move, in display order.
 *
 * Folded by the name the reader sees: the dump ships a handful of spirits twice
 * under one name and otherwise identical, and listing "Entertainer,
 * Entertainer" reads as a bug rather than as two entries.
 */
export function spiritsGranting(
  moveId: string,
  abilities: readonly Ability[],
  displayName: (ability: Ability) => string,
): Ability[] {
  const seen = new Set<string>();
  const out: Ability[] = [];
  for (const ability of abilities) {
    if (ability.grantsAbilityId !== moveId) continue;
    const name = displayName(ability);
    if (seen.has(name)) continue;
    seen.add(name);
    out.push(ability);
  }
  return out.sort((left, right) => displayName(left).localeCompare(displayName(right)));
}
