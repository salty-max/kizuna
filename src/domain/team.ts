import {
  BENCH_SLOT_IDS,
  COORDINATOR_SLOT_IDS,
  DEFAULT_FORMATION,
  MANAGER_SLOT_ID,
  findFormation,
  type Formation,
} from "./formations";
import {
  STAT_KEYS,
  addBaseStats,
  computePower,
  emptyBaseStats,
  totalOf,
  type BaseStats,
  type PowerStats,
} from "./stats";
import {
  RARITY_SCALES,
  type BuildType,
  type Dataset,
  type Equipment,
  type EquipmentSlot,
  type Passive,
  type PassiveSource,
  type Player,
  type Position,
  type Rarity,
  type RarityScale,
} from "./types";

/** Five preset slots plus one custom passive, matching the in-game limit. */
export const MAX_SLOT_PASSIVES = 6;

export type SlotKind = "pitch" | "bench" | "manager" | "coordinator";

/**
 * A passive on a squad slot. `value` is the percentage the user types in: the
 * dataset only gives `strongValue`/`weakValue` as reference bounds, and the real
 * number depends on the passive's in-game level, so it cannot be inferred here.
 */
export interface SlotPassive {
  passiveId: string | null;
  value: number;
}

export interface SlotAssignment {
  playerId: number | null;
  rarity: Rarity;
  /**
   * Overrides the archetype the dataset records for this entry.
   *
   * The dataset's `buildType` belongs to a *drop*, not to a character: 30 names
   * appear across entries with conflicting archetypes (Steve Grim exists as
   * justice, roughPlay and counter), and Basara rarity lets you re-pick it
   * outright. So it has to be settable per slot. `null` means "inherit".
   */
  buildType: BuildType | null;
  equipment: Partial<Record<EquipmentSlot, string>>;
  passives: SlotPassive[];
}

export interface Team {
  name: string;
  formationId: string;
  slots: Record<string, SlotAssignment>;
}

export function emptyAssignment(): SlotAssignment {
  return {
    playerId: null,
    rarity: "common",
    buildType: null,
    equipment: {},
    passives: Array.from({ length: MAX_SLOT_PASSIVES }, () => ({
      passiveId: null,
      value: 0,
    })),
  };
}

export function createTeam(formationId: string = DEFAULT_FORMATION.id): Team {
  const formation = findFormation(formationId);
  const slots: Record<string, SlotAssignment> = {};
  for (const id of allSlotIds(formation)) slots[id] = emptyAssignment();
  return { name: "Nouvelle équipe", formationId: formation.id, slots };
}

/**
 * Which passive catalogue a given passive slot draws from. The first five are
 * the character's own presets — read from the player, manager or coordinator
 * list depending on the squad slot — and the sixth is the custom passive, which
 * has its own (weaker) catalogue.
 */
export function passiveSourceFor(kind: SlotKind, index: number): PassiveSource {
  if (index === MAX_SLOT_PASSIVES - 1) return "custom";
  if (kind === "manager") return "manager";
  if (kind === "coordinator") return "coordinator";
  return "player";
}

export function allSlotIds(formation: Formation): string[] {
  return [
    ...formation.slots.map((s) => s.id),
    ...BENCH_SLOT_IDS,
    MANAGER_SLOT_ID,
    ...COORDINATOR_SLOT_IDS,
  ];
}

export function slotKind(slotId: string, formation: Formation): SlotKind {
  if (formation.slots.some((s) => s.id === slotId)) return "pitch";
  if (BENCH_SLOT_IDS.includes(slotId)) return "bench";
  if (slotId === MANAGER_SLOT_ID) return "manager";
  return "coordinator";
}

/**
 * Changing formation keeps every assignment whose slot id survives, and moves
 * the rest onto whatever new pitch slots are free — so switching 4-4-2 → 3-5-2
 * costs you a rebuild of one line, not the whole squad.
 */
export function applyFormation(team: Team, formationId: string): Team {
  const next = findFormation(formationId);
  const previous = findFormation(team.formationId);
  if (next.id === previous.id) return team;

  const nextIds = allSlotIds(next);
  const slots: Record<string, SlotAssignment> = {};
  const orphans: SlotAssignment[] = [];

  for (const id of nextIds) slots[id] = team.slots[id] ?? emptyAssignment();

  for (const [id, assignment] of Object.entries(team.slots)) {
    if (!nextIds.includes(id) && assignment.playerId !== null) orphans.push(assignment);
  }

  for (const orphan of orphans) {
    const free = next.slots.find((s) => slots[s.id]?.playerId == null);
    const target = free?.id ?? BENCH_SLOT_IDS.find((id) => slots[id]?.playerId == null);
    if (target) slots[target] = orphan;
  }

  return { ...team, formationId: next.id, slots };
}

/* ── Resolution ───────────────────────────────────────────────────────────── */

function scaleStats(stats: BaseStats, scale: RarityScale): BaseStats {
  if (scale.multiplier === 1 && scale.flatBonus === 0) return { ...stats };
  const out = emptyBaseStats();
  for (const key of STAT_KEYS) {
    out[key] = Math.round(stats[key] * scale.multiplier) + scale.flatBonus;
  }
  return out;
}

export interface ResolvedPassive {
  passive: Passive;
  value: number;
}

export interface ResolvedSlot {
  slotId: string;
  kind: SlotKind;
  /** The shape's intended position — pitch slots only. */
  expectedPosition: Position | null;
  player: Player | null;
  rarity: Rarity;
  /** The archetype in force: the slot's override, else the dataset's value. */
  buildType: BuildType | null;
  equipment: Equipment[];
  passives: ResolvedPassive[];
  /** The dataset's Common-rarity line scaled by rarity, before equipment. */
  scaledStats: BaseStats;
  /** Rarity-scaled stats plus equipment bonuses. */
  stats: BaseStats;
  total: number;
  /** Derived from `stats`, before any passive is applied. */
  power: PowerStats;
  /** False when a player is fielded out of position. Advisory, not enforced. */
  positionMatch: boolean;
}

export interface ResolvedTeam {
  team: Team;
  formation: Formation;
  slots: ResolvedSlot[];
  /** Pitch slots holding a player — the squad every scope resolves against. */
  starters: ResolvedSlot[];
}

export function resolveTeam(team: Team, dataset: Dataset): ResolvedTeam {
  const formation = findFormation(team.formationId);
  const playersById = new Map(dataset.players.map((p) => [p.id, p]));
  const equipmentById = new Map(dataset.equipment.map((e) => [e.id, e]));
  const passivesById = new Map(dataset.passives.map((p) => [p.id, p]));

  const slots = allSlotIds(formation).map((slotId): ResolvedSlot => {
    const assignment = team.slots[slotId] ?? emptyAssignment();
    const kind = slotKind(slotId, formation);
    const expectedPosition =
      formation.slots.find((s) => s.id === slotId)?.position ?? null;

    const player = assignment.playerId != null
      ? playersById.get(assignment.playerId) ?? null
      : null;

    const equipment = Object.values(assignment.equipment)
      .map((id) => (id ? equipmentById.get(id) : undefined))
      .filter((e): e is Equipment => e !== undefined);

    const passives = assignment.passives
      .map((slotPassive) => {
        const passive = slotPassive.passiveId
          ? passivesById.get(slotPassive.passiveId)
          : undefined;
        return passive ? { passive, value: slotPassive.value } : null;
      })
      .filter((p): p is ResolvedPassive => p !== null && p.value !== 0);

    // Rarity scales the character's own stats; equipment is a flat bonus on
    // top, so it must be added *after* the multiplier, not scaled by it.
    const rarity = assignment.rarity ?? "common";
    const scaledStats = player
      ? scaleStats(player.stats, RARITY_SCALES[rarity])
      : emptyBaseStats();

    const stats = equipment.reduce(
      (acc, item) => addBaseStats(acc, item.stats),
      scaledStats,
    );

    return {
      slotId,
      kind,
      expectedPosition,
      player,
      rarity,
      buildType: assignment.buildType ?? player?.buildType ?? null,
      equipment,
      passives,
      scaledStats,
      stats,
      total: totalOf(stats),
      power: computePower(stats),
      positionMatch:
        player == null || expectedPosition == null || player.position === expectedPosition,
    };
  });

  return {
    team,
    formation,
    slots,
    starters: slots.filter((s) => s.kind === "pitch" && s.player !== null),
  };
}
