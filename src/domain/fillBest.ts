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
  EQUIPMENT_SLOTS,
  POWER_STAT_MAP,
  RARITY_SCALES,
  type BuildType,
  type Dataset,
  type Equipment,
  type Passive,
  type Player,
  type Position,
} from "./types";
import type { StatKey } from "./stats";
import { characterIdentity } from "./rules";

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

function usedCharacterIdentities(team: Team, dataset: Dataset): Set<string> {
  const playersById = new Map(dataset.players.map((player) => [player.id, player]));
  const formation = findFormation(team.formationId);
  const playerSlotIds = new Set([...formation.slots.map((slot) => slot.id), ...BENCH_SLOT_IDS]);
  const used = new Set<string>();
  for (const [slotId, assignment] of Object.entries(team.slots)) {
    if (!playerSlotIds.has(slotId)) continue;
    if (assignment.playerId == null) continue;
    const player = playersById.get(assignment.playerId);
    if (player) used.add(characterIdentity(player));
  }
  return used;
}

function pickBestPlayer(
  pool: readonly Player[],
  used: Set<number>,
  usedIdentities: Set<string>,
  uniqueCharacters: boolean,
  targetKind: SlotKind,
  expectedPosition: Position | null,
  /** When true and a position is set, only natural (or alt) position counts. */
  requirePositionMatch: boolean,
  targetBuildType: BuildType | null,
  requiredSynergyMembers: ReadonlySet<number>,
): Player | null {
  let best: Player | null = null;
  let bestScore = -Infinity;

  for (const player of pool) {
    if (used.has(player.id)) continue;
    // Dump currently tags nearly everyone as Player. Prefer true Coach/Manager
    // roles when present, but never hard-require them or staff stays empty.
    if (
      (targetKind === "pitch" || targetKind === "bench") &&
      (player.role === "Coach" || player.role === "Manager")
    ) {
      continue;
    }
    if (uniqueCharacters && usedIdentities.has(characterIdentity(player))) continue;
    if (requirePositionMatch && expectedPosition && !matchesPosition(player, expectedPosition)) {
      continue;
    }
    let score = playerSlotScore(player, expectedPosition);
    if (targetKind === "coach" && player.role === "Coach") score *= 50;
    if (targetKind === "manager" && player.role === "Manager") score *= 50;
    if (targetBuildType && player.buildType === targetBuildType) score *= 1.08;
    // The user deliberately equipped this attachment: completing it has more
    // tactical value than a small raw-stat edge.
    if (requiredSynergyMembers.has(player.id)) score += 1_000_000;
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
  usedIdentities: Set<string>,
  enforceUniqueIdentity: boolean,
  slotId: string,
  player: Player,
): void {
  const current = slots[slotId] ?? emptyAssignment();
  used.add(player.id);
  if (enforceUniqueIdentity) usedIdentities.add(characterIdentity(player));
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

export type OptimizationReason =
  | "equippedSynergy"
  | "teamBuild"
  | "naturalPosition"
  | "alternatePosition"
  | "fallbackPosition"
  | "rolePower"
  | "totalStats"
  | "staffRole";

interface OptimizationDecision {
  slotId: string;
  slotKind: SlotKind;
  expectedPosition: Position | null;
  playerId: number;
  reasons: OptimizationReason[];
}

export interface OptimizationReport {
  decisions: OptimizationDecision[];
  rarity: typeof DEFAULT_FILLED_RARITY;
  preservesExisting: true;
  uniqueCharacters: true;
}

export interface OptimizationResult {
  team: Team;
  report: OptimizationReport;
}

function optimizationReasons(
  player: Player,
  target: { kind: SlotKind; position: Position | null },
  targetBuildType: BuildType | null,
  requiredSynergyMembers: ReadonlySet<number>,
): OptimizationReason[] {
  const reasons: OptimizationReason[] = [];

  if (requiredSynergyMembers.has(player.id)) reasons.push("equippedSynergy");
  if (targetBuildType && player.buildType === targetBuildType) reasons.push("teamBuild");

  if (target.position) {
    if (player.position === target.position) reasons.push("naturalPosition");
    else if (player.altPosition === target.position) reasons.push("alternatePosition");
    else reasons.push("fallbackPosition");
    reasons.push("rolePower");
  } else if (target.kind === "bench") {
    reasons.push("totalStats");
  } else {
    reasons.push("staffRole", "totalStats");
  }

  return reasons;
}

/**
 * Fill every empty squad slot with the best remaining character for that post.
 * Leaves filled slots, equipment and passives untouched.
 *
 * Two passes: first only natural-position matches (so a thin pool does not put
 * the best FW on a DF slot before FW is filled), then anyone left over.
 */
export function optimizeEmptySlots(
  team: Team,
  dataset: Dataset,
  options: FillBestOptions = {},
): OptimizationResult {
  const includePlayers = options.includePlayers ?? true;
  const includeStaff = options.includeStaff ?? true;
  const formation = findFormation(team.formationId);
  const used = usedPlayerIds(team);
  const usedIdentities = usedCharacterIdentities(team, dataset);
  const slots: Record<string, SlotAssignment> = { ...team.slots };
  const pool = dataset.players;
  const equippedSynergyIds = new Set(
    [team.offensiveSynergyId, team.defensiveSynergyId].filter((id): id is string => id != null),
  );
  const requiredSynergyMembers = new Set(
    dataset.synergies
      .filter((synergy) => equippedSynergyIds.has(synergy.id))
      .flatMap((synergy) => synergy.members),
  );
  const decisions: OptimizationDecision[] = [];

  const targets: Array<{ id: string; kind: SlotKind; position: Position | null }> = [];

  if (includePlayers) {
    for (const slot of formation.slots) {
      targets.push({ id: slot.id, kind: "pitch", position: slot.position });
    }
    for (const id of BENCH_SLOT_IDS) {
      targets.push({ id, kind: "bench", position: null });
    }
  }
  if (includeStaff) {
    targets.push({ id: COACH_SLOT_ID, kind: "coach", position: null });
    for (const id of MANAGER_SLOT_IDS) {
      targets.push({ id, kind: "manager", position: null });
    }
  }

  for (const requireMatch of [true, false] as const) {
    for (const target of targets) {
      const current = slots[target.id] ?? emptyAssignment();
      if (current.playerId != null) continue;
      // Bench/staff have no expected position — only fill them on the free pass.
      if (requireMatch && !target.position) continue;

      const player = pickBestPlayer(
        pool,
        used,
        usedIdentities,
        target.kind === "pitch" || target.kind === "bench",
        target.kind,
        target.position,
        requireMatch,
        team.teamBuildType,
        requiredSynergyMembers,
      );
      if (!player) continue;
      assignPlayer(
        slots,
        used,
        usedIdentities,
        target.kind === "pitch" || target.kind === "bench",
        target.id,
        player,
      );
      decisions.push({
        slotId: target.id,
        slotKind: target.kind,
        expectedPosition: target.position,
        playerId: player.id,
        reasons: optimizationReasons(player, target, team.teamBuildType, requiredSynergyMembers),
      });
    }
  }

  return {
    team: { ...team, slots },
    report: {
      decisions,
      rarity: DEFAULT_FILLED_RARITY,
      preservesExisting: true,
      uniqueCharacters: true,
    },
  };
}

export function fillBestEmptySlots(
  team: Team,
  dataset: Dataset,
  options: FillBestOptions = {},
): Team {
  return optimizeEmptySlots(team, dataset, options).team;
}

/** How many empty character slots this team still has (pitch + bench + staff). */
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
    if (effect.mode === "flat") {
      // Flat base stats: weight by how much the post cares about that stat.
      const weights = position ? EQUIP_STAT_WEIGHTS[position] : null;
      const w = weights?.[effect.baseStat] ?? 0.8;
      let weight = w * 0.35; // smaller than % power buffs of similar "number"
      if (effect.scope === "self" || effect.scope === "team") weight *= 1.2;
      if (effect.conditions.length === 0) weight *= 1.35;
      else weight *= 0.55;
      score += value * weight;
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

/* ── Equipment ────────────────────────────────────────────────────────────── */

/** How much each base stat matters for a formation post (relative weights). */
const EQUIP_STAT_WEIGHTS: Record<Position, Partial<Record<StatKey, number>>> = {
  GK: { pressure: 2, physical: 2, agility: 1.5, intelligence: 1, technique: 0.5 },
  DF: { pressure: 2, physical: 2, technique: 1, intelligence: 1, agility: 0.8 },
  MF: { technique: 2, control: 1.5, intelligence: 1.5, kick: 1, agility: 1 },
  FW: { kick: 2, control: 2, technique: 1.5, physical: 0.8, agility: 1 },
};

/** Score an equipment piece for a post (or raw total if no position). */
export function equipmentFillScore(item: Equipment, position: Position | null): number {
  if (!position) return item.total;
  const weights = EQUIP_STAT_WEIGHTS[position];
  let score = 0;
  for (const key of STAT_KEYS) {
    const value = item.stats[key] ?? 0;
    if (!value) continue;
    score += value * (weights[key] ?? 0.4);
  }
  // Tiny total tie-break so equal weighted pieces still rank.
  return score + item.total * 0.01;
}

/**
 * Fill empty gear slots on one assignment. Does not replace pieces the user set.
 * The same item can equip multiple players (builder has no inventory limit).
 */
export function fillBestEquipment(
  assignment: SlotAssignment,
  position: Position | null,
  dataset: Dataset,
): SlotAssignment {
  if (assignment.playerId == null) return assignment;

  const equipment = { ...assignment.equipment };
  let changed = false;

  for (const slot of EQUIPMENT_SLOTS) {
    if (equipment[slot]) continue;
    const candidates = dataset.equipment.filter((e) => e.slot === slot);
    let best: Equipment | null = null;
    let bestScore = -Infinity;
    for (const item of candidates) {
      const score = equipmentFillScore(item, position);
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    }
    if (best) {
      equipment[slot] = best.id;
      changed = true;
    }
  }

  return changed ? { ...assignment, equipment } : assignment;
}

export function countEmptyEquipment(assignment: SlotAssignment): number {
  if (assignment.playerId == null) return 0;
  return EQUIPMENT_SLOTS.filter((slot) => !assignment.equipment[slot]).length;
}

/**
 * Fill empty gear on every squad member that already has a character.
 * Leaves empty portrait slots alone.
 */
export function fillBestEmptyEquipment(team: Team, dataset: Dataset): Team {
  const formation = findFormation(team.formationId);
  const slots: Record<string, SlotAssignment> = { ...team.slots };
  let changed = false;

  for (const [slotId, assignment] of Object.entries(slots)) {
    if (assignment.playerId == null) continue;
    const expected = formation.slots.find((s) => s.id === slotId)?.position ?? null;
    const next = fillBestEquipment(assignment, expected, dataset);
    if (next !== assignment) {
      slots[slotId] = next;
      changed = true;
    }
  }

  return changed ? { ...team, slots } : team;
}

export function countEmptyEquipmentOnTeam(team: Team): number {
  let n = 0;
  for (const assignment of Object.values(team.slots)) {
    n += countEmptyEquipment(assignment);
  }
  return n;
}
