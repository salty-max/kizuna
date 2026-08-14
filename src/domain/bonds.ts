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

export interface EquippedSynergies {
  offensive: DetectedBond | null;
  defensive: DetectedBond | null;
}

function evaluateBond(resolved: ResolvedTeam, synergy: BondSynergy): DetectedBond {
  const roster = new Set(resolved.slots.flatMap((slot) => (slot.player ? [slot.player.id] : [])));
  const present = synergy.members.filter((id) => roster.has(id));
  const missing = synergy.members.filter((id) => !roster.has(id));
  return {
    synergy,
    status: missing.length === 0 ? "active" : "partial",
    present,
    missing,
  };
}

/** Resolve only the two attachments selected in the Team Dock. */
export function resolveEquippedSynergies(
  resolved: ResolvedTeam,
  synergies: readonly BondSynergy[],
): EquippedSynergies {
  const byId = new Map(synergies.map((synergy) => [synergy.id, synergy]));
  const resolve = (id: string | null, kind: BondSynergy["kind"]): DetectedBond | null => {
    if (!id) return null;
    const synergy = byId.get(id);
    return synergy?.kind === kind ? evaluateBond(resolved, synergy) : null;
  };

  return {
    offensive: resolve(resolved.team.offensiveSynergyId, "offensive"),
    defensive: resolve(resolved.team.defensiveSynergyId, "defensive"),
  };
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
  const out: DetectedBond[] = [];
  for (const synergy of synergies) {
    const detected = evaluateBond(resolved, synergy);
    if (detected.present.length > 0) out.push(detected);
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
