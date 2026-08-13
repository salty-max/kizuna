import { BENCH_SLOT_IDS, COACH_SLOT_ID, MANAGER_SLOT_IDS, findFormation } from "./formations";
import { computePower, STAT_KEYS, type BaseStats, type PowerKey, type PowerStats } from "./stats";
import {
  DEFAULT_FILLED_RARITY,
  emptyAssignment,
  filledAssignment,
  MAX_SLOT_PASSIVES,
  passiveSourceFor,
  passiveValueForRarity,
  type SlotAssignment,
  type SlotKind,
  type Team,
} from "./team";
import {
  POWER_STAT_MAP,
  RARITY_SCALES,
  type BuildType,
  type Dataset,
  type Passive,
  type Player,
  type Position,
} from "./types";

/**
 * Greedy "fill empty" helpers for the builder.
 *
 * Competitive floor only: Legendary, no auto Hero/Basara (those are capped
 * acquisitions the user should pick deliberately). Never overwrites a slot that
 * already has a character or a passive the user set.
 */

/** Position-weighted power so GK doesn't win on shoot AT. */
export function positionPowerScore(power: PowerStats, position: Position): number {
  switch (position) {
    case "GK":
      return power.wallDF * 2 + power.kp + power.scrambleDF;
    case "DF":
      return power.wallDF * 2 + power.focusDF + power.scrambleDF;
    case "MF":
      return power.focusAT + power.focusDF + power.scrambleAT + power.scrambleDF;
    case "FW":
      return power.shootAT * 2 + power.focusAT + power.scrambleAT;
  }
}

function scaleToLegendary(stats: BaseStats): BaseStats {
  const { multiplier, flatBonus } = RARITY_SCALES.legendary;
  const out = { ...stats };
  for (const key of STAT_KEYS) {
    out[key] = Math.round(stats[key] * multiplier) + flatBonus;
  }
  return out;
}

function matchesPosition(player: Player, position: Position): boolean {
  return player.position === position || player.altPosition === position;
}

/** Score a player for a formation slot at the Legendary competitive floor. */
export function playerSlotScore(player: Player, expectedPosition: Position | null): number {
  const scaled = scaleToLegendary(player.stats);
  if (!expectedPosition) {
    return STAT_KEYS.reduce((sum, key) => sum + scaled[key], 0);
  }
  const base = positionPowerScore(computePower(scaled), expectedPosition);
  // Soft preference for natural position; out-of-position still allowed if nothing better.
  return matchesPosition(player, expectedPosition) ? base * 1.15 : base;
}

function usedPlayerIds(team: Team): Set<number> {
  const used = new Set<number>();
  for (const assignment of Object.values(team.slots)) {
    if (assignment.playerId != null) used.add(assignment.playerId);
  }
  return used;
}

function pickBestPlayer(
  pool: readonly Player[],
  used: Set<number>,
  expectedPosition: Position | null,
  /** When true and a position is set, only natural (or alt) position counts. */
  requirePositionMatch: boolean,
): Player | null {
  let best: Player | null = null;
  let bestScore = -Infinity;

  for (const player of pool) {
    if (used.has(player.id)) continue;
    if (requirePositionMatch && expectedPosition && !matchesPosition(player, expectedPosition)) {
      continue;
    }
    const score = playerSlotScore(player, expectedPosition);
    if (score > bestScore) {
      bestScore = score;
      best = player;
    }
  }
  return best;
}

function assignPlayer(
  slots: Record<string, SlotAssignment>,
  used: Set<number>,
  slotId: string,
  player: Player,
): void {
  const current = slots[slotId] ?? emptyAssignment();
  used.add(player.id);
  slots[slotId] = filledAssignment(player.id, {
    buildType: player.buildType,
    // Keep any gear/passives already typed on an empty portrait (rare).
    equipment: current.equipment,
    passives: current.passives,
    altBranch: current.altBranch,
    rarity: DEFAULT_FILLED_RARITY,
  });
}

export interface FillBestOptions {
  /** Pitch + bench (default true). */
  includePlayers?: boolean;
  /** Coach + managers (default true). */
  includeStaff?: boolean;
}

/**
 * Fill every empty squad slot with the best remaining character for that post.
 * Leaves filled slots, equipment and passives untouched.
 *
 * Two passes: first only natural-position matches (so a thin pool does not put
 * the best FW on a DF slot before FW is filled), then anyone left over.
 */
export function fillBestEmptySlots(
  team: Team,
  dataset: Dataset,
  options: FillBestOptions = {},
): Team {
  const includePlayers = options.includePlayers ?? true;
  const includeStaff = options.includeStaff ?? true;
  const formation = findFormation(team.formationId);
  const used = usedPlayerIds(team);
  const slots: Record<string, SlotAssignment> = { ...team.slots };
  const pool = dataset.players;

  const targets: Array<{ id: string; position: Position | null }> = [];

  if (includePlayers) {
    for (const slot of formation.slots) {
      targets.push({ id: slot.id, position: slot.position });
    }
    for (const id of BENCH_SLOT_IDS) {
      targets.push({ id, position: null });
    }
  }
  if (includeStaff) {
    targets.push({ id: COACH_SLOT_ID, position: null });
    for (const id of MANAGER_SLOT_IDS) {
      targets.push({ id, position: null });
    }
  }

  for (const requireMatch of [true, false] as const) {
    for (const target of targets) {
      const current = slots[target.id] ?? emptyAssignment();
      if (current.playerId != null) continue;
      // Bench/staff have no expected position — only fill them on the free pass.
      if (requireMatch && !target.position) continue;

      const player = pickBestPlayer(pool, used, target.position, requireMatch);
      if (!player) continue;
      assignPlayer(slots, used, target.id, player);
    }
  }

  return { ...team, slots };
}

/** How many empty player slots this team still has (pitch/bench/staff). */
export function countEmptySlots(team: Team): number {
  const formation = findFormation(team.formationId);
  const ids = [
    ...formation.slots.map((s) => s.id),
    ...BENCH_SLOT_IDS,
    COACH_SLOT_ID,
    ...MANAGER_SLOT_IDS,
  ];
  let n = 0;
  for (const id of ids) {
    if ((team.slots[id] ?? emptyAssignment()).playerId == null) n += 1;
  }
  return n;
}

/* ── Passives ─────────────────────────────────────────────────────────────── */

const POSITION_POWER_KEYS: Record<Position, readonly PowerKey[]> = {
  GK: ["wallDF", "kp", "scrambleDF"],
  DF: ["wallDF", "focusDF", "scrambleDF"],
  MF: ["focusAT", "focusDF", "scrambleAT", "scrambleDF"],
  FW: ["shootAT", "focusAT", "scrambleAT"],
};

function powerKeysForPosition(position: Position | null): ReadonlySet<PowerKey> {
  if (!position) {
    return new Set(["shootAT", "focusAT", "focusDF", "wallDF", "scrambleAT", "scrambleDF", "kp"]);
  }
  return new Set(POSITION_POWER_KEYS[position]);
}

/**
 * Score a catalogue row for auto-fill. Prefers unconditional self/team buffs
 * that hit the position's power keys, at the magnitude the rarity unlocks.
 */
export function passiveFillScore(
  passive: Passive,
  rarity: SlotAssignment["rarity"],
  catalogue: readonly Passive[],
  position: Position | null,
  buildType: BuildType | null,
): number {
  if (passive.effects.length === 0) return passive.strongValue * 0.1;

  const want = powerKeysForPosition(position);
  const value = passiveValueForRarity(passive, rarity, catalogue);
  let score = 0;

  for (const effect of passive.effects) {
    if (effect.direction === "decrease") {
      score -= value * 0.5;
      continue;
    }
    const mapped = POWER_STAT_MAP[effect.stat];
    const hit = mapped ? mapped.some((k) => want.has(k)) : false;
    // Gauges (tension, drop rates…) still matter a bit, but lose to real power.
    let weight = hit ? 1 : mapped ? 0.15 : 0.35;
    if (effect.scope === "self" || effect.scope === "team") weight *= 1.2;
    if (effect.conditions.length === 0) weight *= 1.35;
    else weight *= 0.55;
    score += value * weight;
  }

  if (buildType && passive.buildType === buildType) score *= 1.1;
  return score;
}

/**
 * Fill empty passive rows on one assignment from the free lottery/custom pool.
 * Does not replace rows the user already chose.
 */
export function fillBestPassives(
  assignment: SlotAssignment,
  kind: SlotKind,
  position: Position | null,
  dataset: Dataset,
): SlotAssignment {
  if (assignment.playerId == null) return assignment;

  const buildType = assignment.buildType;
  const passives = assignment.passives.map((p) => ({ ...p }));
  const usedFamilies = new Set<number>();
  const usedIds = new Set<string>();

  for (const row of passives) {
    if (!row.passiveId) continue;
    usedIds.add(row.passiveId);
    const existing = dataset.passives.find((p) => p.id === row.passiveId);
    if (existing?.family != null) usedFamilies.add(existing.family);
  }

  for (let index = 0; index < MAX_SLOT_PASSIVES; index++) {
    const current = passives[index] ?? { passiveId: null, value: 0 };
    if (current.passiveId) continue;

    const source = passiveSourceFor(kind, index);
    const candidates = dataset.passives.filter((p) => {
      if (p.source !== source) return false;
      if (usedIds.has(p.id)) return false;
      if (p.family != null && usedFamilies.has(p.family)) return false;
      return true;
    });

    // Collapse to best tier per family before scoring, else lower tiers clutter.
    const representatives = new Map<string, Passive>();
    for (const p of candidates) {
      const key = p.family != null ? `f:${p.family}` : p.id;
      const prev = representatives.get(key);
      if (!prev || (p.tier ?? -1) > (prev.tier ?? -1)) {
        representatives.set(key, p);
      }
    }

    let best: Passive | null = null;
    let bestScore = -Infinity;
    for (const p of representatives.values()) {
      const score = passiveFillScore(p, assignment.rarity, dataset.passives, position, buildType);
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }

    if (!best || bestScore <= 0) continue;

    usedIds.add(best.id);
    if (best.family != null) usedFamilies.add(best.family);
    passives[index] = {
      passiveId: best.id,
      value: passiveValueForRarity(best, assignment.rarity, dataset.passives),
    };
  }

  return { ...assignment, passives };
}

export function countEmptyPassives(assignment: SlotAssignment): number {
  return assignment.passives.filter((p) => !p.passiveId).length;
}
