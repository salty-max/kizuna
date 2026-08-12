import type { ResolvedTeam } from "./team";
import type { BondSynergy } from "./types";

/**
 * Bond / kizuna detection — the game's named character pairings (Prince des
 * neiges, Un lien éternel…). Distinct from passive-stat synergy: these are
 * roster-shaped unlocks, not percentage modifiers.
 */

export type BondStatus = "active" | "partial";

export interface DetectedBond {
  synergy: BondSynergy;
  status: BondStatus;
  /** Member ids present anywhere on the squad (pitch + bench + staff player slots). */
  present: number[];
  /** Member ids still missing. */
  missing: number[];
}

/**
 * Score every bond against the current squad.
 *
 * Active = every member is rostered. Partial = at least one present but not
 * all. Missing bonds are kept so the UI can show "close" pairings (n−1) without
 * listing the whole catalogue.
 */
export function detectBonds(
  resolved: ResolvedTeam,
  synergies: readonly BondSynergy[],
): DetectedBond[] {
  const roster = new Set<number>();
  for (const slot of resolved.slots) {
    if (slot.player) roster.add(slot.player.id);
  }

  const out: DetectedBond[] = [];
  for (const synergy of synergies) {
    const present: number[] = [];
    const missing: number[] = [];
    for (const id of synergy.members) {
      if (roster.has(id)) present.push(id);
      else missing.push(id);
    }
    if (present.length === 0) continue;

    out.push({
      synergy,
      status: missing.length === 0 ? "active" : "partial",
      present,
      missing,
    });
  }

  // Active first, then closest partials (fewest missing, then most present).
  return out.sort((a, b) => {
    const rank = (s: BondStatus) => (s === "active" ? 0 : 1);
    const byStatus = rank(a.status) - rank(b.status);
    if (byStatus !== 0) return byStatus;
    const byMissing = a.missing.length - b.missing.length;
    if (byMissing !== 0) return byMissing;
    return b.present.length - a.present.length;
  });
}
