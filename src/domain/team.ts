import {
  BENCH_SLOT_IDS,
  MANAGER_SLOT_IDS,
  DEFAULT_FORMATION,
  COACH_SLOT_ID,
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
  MAX_TEAM_TACTICS,
  RARITY_SCALES,
  type BuildType,
  type Dataset,
  type Equipment,
  type EquipmentSlot,
  type Ability,
  type Passive,
  type PassiveSource,
  type Player,
  type Position,
  type Rarity,
  type RarityScale,
} from "./types";

/** Five preset slots plus one custom passive, matching the in-game limit. */
export const MAX_SLOT_PASSIVES = 6;

export type SlotKind = "pitch" | "bench" | "coach" | "manager";

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
  /**
   * Bascule sur la seconde branche de techniques (niveaux 30/38/43).
   *
   * C'est le seul choix de build sur les techniques : les six premières sont
   * apprises d'office, seule la queue se remplace. `false` = tronc commun.
   */
  altBranch: boolean;
  equipment: Partial<Record<EquipmentSlot, string>>;
  passives: SlotPassive[];
}

export interface Team {
  name: string;
  formationId: string;
  /**
   * Prepared tactics (string ids, max `MAX_TEAM_TACTICS`). Order is the loadout
   * order; empty slots are omitted rather than stored as nulls.
   */
  tacticIds: string[];
  slots: Record<string, SlotAssignment>;
}

export function emptyAssignment(): SlotAssignment {
  return {
    playerId: null,
    rarity: "common",
    buildType: null,
    altBranch: false,
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
  // Name is filled by the UI with a locale-aware default when empty.
  return { name: "", formationId: formation.id, tacticIds: [], slots };
}

/**
 * Guarantee a well-formed Team after decode / restore. Older local drafts and
 * partial share payloads can omit `tacticIds` or miss a slot key.
 */
export function normalizeTeam(team: Team): Team {
  const formation = findFormation(team.formationId);
  const slots: Record<string, SlotAssignment> = {};
  for (const id of allSlotIds(formation)) {
    slots[id] = team.slots[id] ?? emptyAssignment();
  }
  return {
    name: team.name ?? "",
    formationId: formation.id,
    tacticIds: (team.tacticIds ?? []).filter(Boolean).slice(0, MAX_TEAM_TACTICS),
    slots,
  };
}

/**
 * Which passive catalogue a given passive slot draws from.
 * Coach / manager slots use their game catalogues (`mps*` / `cps*`).
 * Pitch and the 6th "custom" slot share the player catalogue until the game
 * exposes a separate custom list.
 */
export function passiveSourceFor(kind: SlotKind, _index: number): PassiveSource {
  if (kind === "coach") return "coach";
  if (kind === "manager") return "manager";
  return "player";
}

export function allSlotIds(formation: Formation): string[] {
  return [
    ...formation.slots.map((s) => s.id),
    ...BENCH_SLOT_IDS,
    COACH_SLOT_ID,
    ...MANAGER_SLOT_IDS,
  ];
}

export function slotKind(slotId: string, formation: Formation): SlotKind {
  if (formation.slots.some((s) => s.id === slotId)) return "pitch";
  if (BENCH_SLOT_IDS.includes(slotId)) return "bench";
  if (slotId === COACH_SLOT_ID) return "coach";
  return "manager";
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

  return normalizeTeam({ ...team, formationId: next.id, tacticIds: team.tacticIds, slots });
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

/**
 * Pick the character's own stat line for this rarity.
 *
 * Common / Rising / Advanced / Top / Legendary all start from the Common
 * table (lv99); the intermediate tiers then apply `RARITY_SCALES`.
 * Hero and Basara prefer the real datamined tables when the character has one,
 * and only fall back to the ratio estimate when they do not.
 */
function statsForRarity(player: Player, rarity: Rarity): BaseStats {
  if (rarity === "hero" && player.heroStats) return { ...player.heroStats.lv99 };
  if (rarity === "basara" && player.basaraStats) return { ...player.basaraStats.lv99 };

  const scale = RARITY_SCALES[rarity];
  return scaleStats(player.stats, scale);
}

/** Une technique du personnage, résolue contre le catalogue. */
export interface ResolvedSkill {
  level: number;
  ability: Ability;
  /** Vrai quand ce slot vient de la branche alternative. */
  fromAltBranch: boolean;
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
  /** Les techniques effectivement apprises, branche choisie appliquée. */
  skills: ResolvedSkill[];
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

/**
 * Applique la branche choisie.
 *
 * `skillsAlt` n'ajoute pas de slots : ses trois entrées remplacent celles de
 * `skills` aux mêmes niveaux (30/38/43). Concaténer les deux listes donnerait
 * neuf techniques à un personnage qui en a six.
 */
function resolveSkills(
  player: Player | null,
  rarity: Rarity,
  altBranch: boolean,
  abilitiesById: Map<string, Ability>,
): ResolvedSkill[] {
  if (!player) return [];

  // La forme choisie a ses propres techniques, comme elle a ses propres stats.
  // Un Hero n'a par ailleurs jamais de branche alternative.
  const set = (rarity === "hero" && player.heroSkills) ||
    (rarity === "basara" && player.basaraSkills) || {
      skills: player.skills,
      skillsAlt: player.skillsAlt,
    };

  const replaced = new Set(altBranch ? set.skillsAlt.map((s) => s.level) : []);
  const chosen = [
    ...set.skills.filter((s) => !replaced.has(s.level)).map((s) => ({ ...s, alt: false })),
    ...(altBranch ? set.skillsAlt.map((s) => ({ ...s, alt: true })) : []),
  ];

  return chosen
    .sort((a, b) => a.level - b.level)
    .flatMap(({ level, abilityId, alt }) => {
      const ability = abilitiesById.get(abilityId);
      // Une référence inconnue est impossible — build-data refuse de produire
      // un joueur dont une technique ne résout pas — mais un dataset servi
      // depuis un cache périmé le pourrait.
      return ability ? [{ level, ability, fromAltBranch: alt }] : [];
    });
}

export function resolveTeam(team: Team, dataset: Dataset): ResolvedTeam {
  const formation = findFormation(team.formationId);
  const playersById = new Map(dataset.players.map((p) => [p.id, p]));
  const equipmentById = new Map(dataset.equipment.map((e) => [e.id, e]));
  const passivesById = new Map(dataset.passives.map((p) => [p.id, p]));
  const abilitiesById = new Map(dataset.abilities.map((a) => [a.id, a]));

  const slots = allSlotIds(formation).map((slotId): ResolvedSlot => {
    const assignment = team.slots[slotId] ?? emptyAssignment();
    const kind = slotKind(slotId, formation);
    const expectedPosition = formation.slots.find((s) => s.id === slotId)?.position ?? null;

    const player =
      assignment.playerId != null ? (playersById.get(assignment.playerId) ?? null) : null;

    const equipment = Object.values(assignment.equipment)
      .map((id) => (id ? equipmentById.get(id) : undefined))
      .filter((e): e is Equipment => e !== undefined);

    const passives = assignment.passives
      .map((slotPassive) => {
        const passive = slotPassive.passiveId ? passivesById.get(slotPassive.passiveId) : undefined;
        return passive ? { passive, value: slotPassive.value } : null;
      })
      .filter((p): p is ResolvedPassive => p !== null && p.value !== 0);

    // Prefer real Hero/Basara tables; otherwise scale Common. Equipment is a
    // flat bonus on top and must never be multiplied by the rarity factor.
    const rarity = assignment.rarity ?? "common";
    const scaledStats = player ? statsForRarity(player, rarity) : emptyBaseStats();

    const stats = equipment.reduce((acc, item) => addBaseStats(acc, item.stats), scaledStats);

    return {
      slotId,
      kind,
      expectedPosition,
      player,
      rarity,
      buildType: assignment.buildType ?? player?.buildType ?? null,
      skills: resolveSkills(player, rarity, assignment.altBranch ?? false, abilitiesById),
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
