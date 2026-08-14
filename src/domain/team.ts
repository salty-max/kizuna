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
  BUILD_TYPES,
  MAX_BASARA_IN_SQUAD,
  MAX_HERO_STARTERS,
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
import { findRuleset, type RulesetId } from "./rules";
import { normalizeBuildRank, type BuildRank } from "./buildRank";

/** Five preset slots plus one custom passive, matching the in-game limit. */
export const MAX_SLOT_PASSIVES = 6;

/**
 * Default rarity when the user *picks* a character into a slot.
 * Competitive floor is Legendary; Hero/Basara are separate capped acquisitions.
 * Empty slots keep `common` so tallies ignore vacant pitch spots.
 */
export const DEFAULT_FILLED_RARITY: Rarity = "legendary";

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
  /** Match context used for legality checks; defaults to ordinary play. */
  rulesetId: RulesetId;
  /** One Synergy Flag and one Synergy Pillar, matching the Team Dock. */
  offensiveSynergyId: string | null;
  defensiveSynergyId: string | null;
  /** In-match Build Rank scenario selected for conditional power projection. */
  teamBuildType: BuildType | null;
  buildRank: BuildRank;
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

/** Assignment for a freshly picked character — Legendary, not Common. */
export function filledAssignment(
  playerId: number,
  extras: Partial<Omit<SlotAssignment, "playerId">> = {},
): SlotAssignment {
  return {
    ...emptyAssignment(),
    ...extras,
    playerId,
    rarity: extras.rarity ?? DEFAULT_FILLED_RARITY,
  };
}

/**
 * Put an assignment in one slot while keeping a concrete player entry unique
 * across pitch, bench and staff. Selecting an already rostered entry moves it:
 * the destination keeps the build currently configured there and the former
 * slot is reset completely.
 *
 * Distinct database entries for the same character remain valid here. Their
 * broader identity is a ruleset concern (the tournament rejects them later).
 */
export function updateSlotAssignment(team: Team, slotId: string, next: SlotAssignment): Team {
  const slots = { ...team.slots };
  if (next.playerId != null) {
    for (const [otherSlotId, assignment] of Object.entries(slots)) {
      if (otherSlotId !== slotId && assignment.playerId === next.playerId) {
        slots[otherSlotId] = emptyAssignment();
      }
    }
  }
  slots[slotId] = next;
  return { ...team, slots };
}

function slotMoveGroup(kind: SlotKind): "player" | "coach" | "manager" {
  return kind === "pitch" || kind === "bench" ? "player" : kind;
}

/** Player/passive loadouts may only move between slots backed by the same catalogue. */
export function canMoveSlotAssignment(
  team: Team,
  sourceSlotId: string,
  targetSlotId: string,
): boolean {
  const formation = findFormation(team.formationId);
  return (
    sourceSlotId !== targetSlotId &&
    sourceSlotId in team.slots &&
    targetSlotId in team.slots &&
    team.slots[sourceSlotId]?.playerId != null &&
    slotMoveGroup(slotKind(sourceSlotId, formation)) ===
      slotMoveGroup(slotKind(targetSlotId, formation))
  );
}

/** Move a complete compatible character build, swapping when occupied. */
export function moveSlotAssignment(team: Team, sourceSlotId: string, targetSlotId: string): Team {
  if (!canMoveSlotAssignment(team, sourceSlotId, targetSlotId)) return team;
  const source = team.slots[sourceSlotId];
  const target = team.slots[targetSlotId];
  if (!source || !target) return team;

  return {
    ...team,
    slots: {
      ...team.slots,
      [sourceSlotId]: target,
      [targetSlotId]: source,
    },
  };
}

/** Hero starters on the pitch (bench Heroes do not count). */
export function countHeroStarters(team: Team, excludeSlotId?: string): number {
  const formation = findFormation(team.formationId);
  let n = 0;
  for (const { id } of formation.slots) {
    if (id === excludeSlotId) continue;
    const a = team.slots[id];
    if (a?.playerId != null && a.rarity === "hero") n++;
  }
  return n;
}

/** Basara across pitch + bench + staff (whole roster). */
export function countBasaraInSquad(team: Team, excludeSlotId?: string): number {
  const formation = findFormation(team.formationId);
  let n = 0;
  for (const id of allSlotIds(formation)) {
    if (id === excludeSlotId) continue;
    const a = team.slots[id];
    if (a?.playerId != null && a.rarity === "basara") n++;
  }
  return n;
}

function isPitchSlot(team: Team, slotId: string): boolean {
  return findFormation(team.formationId).slots.some((s) => s.id === slotId);
}

/**
 * Whether `rarity` can be set on `slotId` without breaking game caps.
 * Current slot is excluded so re-selecting the same rarity always stays valid.
 */
export function isRarityAllowed(team: Team, slotId: string, rarity: Rarity): boolean {
  if (rarity === "hero") {
    // Bench/staff Heroes are free — only pitch Heroes are capped.
    if (!isPitchSlot(team, slotId)) return true;
    return countHeroStarters(team, slotId) < MAX_HERO_STARTERS;
  }
  if (rarity === "basara") {
    return countBasaraInSquad(team, slotId) < MAX_BASARA_IN_SQUAD;
  }
  return true;
}

/** Hero / Basara counters for the toolbar. */
export function rarityBudget(team: Team): {
  heroes: number;
  maxHeroes: number;
  basaras: number;
  maxBasaras: number;
  heroOver: boolean;
  basaraOver: boolean;
} {
  const heroes = countHeroStarters(team);
  const basaras = countBasaraInSquad(team);
  return {
    heroes,
    maxHeroes: MAX_HERO_STARTERS,
    basaras,
    maxBasaras: MAX_BASARA_IN_SQUAD,
    heroOver: heroes > MAX_HERO_STARTERS,
    basaraOver: basaras > MAX_BASARA_IN_SQUAD,
  };
}

export function createTeam(formationId: string = DEFAULT_FORMATION.id): Team {
  const formation = findFormation(formationId);
  const slots: Record<string, SlotAssignment> = {};
  for (const id of allSlotIds(formation)) slots[id] = emptyAssignment();
  // Name is filled by the UI with a locale-aware default when empty.
  return {
    name: "",
    formationId: formation.id,
    rulesetId: "standard",
    offensiveSynergyId: null,
    defensiveSynergyId: null,
    teamBuildType: null,
    buildRank: 0,
    tacticIds: [],
    slots,
  };
}

/**
 * Remove the whole roster while preserving the user's team setup.
 *
 * A global "clear" action should not silently reset the team name, formation,
 * match rules or tactical plan. Rebuilding the roster is a different intent
 * from creating a brand-new team.
 */
export function clearTeamAssignments(team: Team): Team {
  const formation = findFormation(team.formationId);
  const slots: Record<string, SlotAssignment> = {};
  for (const id of allSlotIds(formation)) slots[id] = emptyAssignment();
  return { ...team, slots };
}

/**
 * Guarantee a well-formed Team after decode / restore. Older local drafts and
 * partial share payloads can omit `tacticIds` or miss a slot key.
 */
export function normalizeTeam(team: Team): Team {
  const formation = findFormation(team.formationId);
  const slots: Record<string, SlotAssignment> = {};
  const usedPlayerIds = new Set<number>();
  for (const id of allSlotIds(formation)) {
    const assignment = team.slots[id] ?? emptyAssignment();
    if (assignment.playerId != null && usedPlayerIds.has(assignment.playerId)) {
      slots[id] = emptyAssignment();
      continue;
    }
    slots[id] = assignment;
    if (assignment.playerId != null) usedPlayerIds.add(assignment.playerId);
  }
  return {
    name: team.name ?? "",
    formationId: formation.id,
    rulesetId: findRuleset(team.rulesetId).id,
    offensiveSynergyId: team.offensiveSynergyId || null,
    defensiveSynergyId: team.defensiveSynergyId || null,
    teamBuildType: BUILD_TYPES.includes(team.teamBuildType as BuildType)
      ? team.teamBuildType
      : null,
    buildRank: normalizeBuildRank(team.buildRank),
    tacticIds: (team.tacticIds ?? []).filter(Boolean).slice(0, MAX_TEAM_TACTICS),
    slots,
  };
}

/**
 * Which passive catalogue a given passive slot draws from.
 *
 * Game model (HANDOFF): five lottery presets (style/growth pools — not fixed
 * per character) plus one custom farmed slot at level 50. Coach/manager use
 * their own catalogues. Index 0–4 → presets, index 5 → custom.
 */
export function passiveSourceFor(kind: SlotKind, index: number): PassiveSource {
  if (kind === "coach") return "coach";
  if (kind === "manager") return "manager";
  if (index >= MAX_SLOT_PASSIVES - 1) return "custom";
  return "player";
}

/**
 * Map character rarity to the dump's passive tier (0…4).
 * Hero / Basara use the top preset tier (Legendary ceiling for lottery rows).
 */
export function passiveTierForRarity(rarity: Rarity): number {
  switch (rarity) {
    case "common":
      return 0;
    case "rising":
      return 1;
    case "advanced":
      return 2;
    case "top":
      return 3;
    case "legendary":
    case "hero":
    case "basara":
      return 4;
    default:
      return 0;
  }
}

/**
 * Magnitude for a passive at a given character rarity: prefer the sibling row
 * in the same `family` at the matching tier, else fall back to `strongValue`.
 */
export function passiveValueForRarity(
  passive: Passive,
  rarity: Rarity,
  catalogue: readonly Passive[],
): number {
  if (passive.family == null) return passive.strongValue;
  const want = passiveTierForRarity(rarity);
  const match = catalogue.find((p) => p.family === passive.family && p.tier === want);
  if (match) return match.strongValue;
  // Closest lower tier, then any sibling.
  const siblings = catalogue
    .filter((p) => p.family === passive.family && p.tier != null)
    .sort((a, b) => (b.tier ?? 0) - (a.tier ?? 0));
  const lower = siblings.find((p) => (p.tier ?? 0) <= want);
  return lower?.strongValue ?? siblings[0]?.strongValue ?? passive.strongValue;
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
export function applyFormation(
  team: Team,
  formationId: string,
  players: readonly Player[] = [],
): Team {
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

  const playersById = new Map(players.map((player) => [player.id, player]));

  for (const orphan of orphans) {
    const player = orphan.playerId == null ? null : (playersById.get(orphan.playerId) ?? null);
    const compatible = player
      ? next.slots.find(
          (slot) =>
            slots[slot.id]?.playerId == null &&
            (player.position === slot.position || player.altPosition === slot.position),
        )
      : null;
    // A formation change must not silently manufacture a warning. When no
    // compatible pitch slot remains, keep the player available on the bench.
    const target =
      compatible?.id ??
      BENCH_SLOT_IDS.find((id) => slots[id]?.playerId == null) ??
      next.slots.find((slot) => slots[slot.id]?.playerId == null)?.id;
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
 * table at the active ruleset's level; intermediate tiers then apply
 * `RARITY_SCALES`.
 * Hero and Basara prefer the real datamined tables when the character has one,
 * and only fall back to the ratio estimate when they do not.
 */
function statsForRarity(player: Player, rarity: Rarity, level: 50 | 99): BaseStats {
  if (rarity === "hero" && player.heroStats) return { ...player.heroStats[`lv${level}`] };
  if (rarity === "basara" && player.basaraStats) return { ...player.basaraStats[`lv${level}`] };

  const scale = RARITY_SCALES[rarity];
  return scaleStats(level === 50 ? player.statsLv50 : player.stats, scale);
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
  const level = findRuleset(team.rulesetId).levelCap === 50 ? 50 : 99;
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
    const scaledStats = player ? statsForRarity(player, rarity, level) : emptyBaseStats();

    let stats = equipment.reduce((acc, item) => addBaseStats(acc, item.stats), scaledStats);

    // Flat base-stat passives on this slot (self). Team-scoped flats need a
    // second pass once every starter exists — see below.
    for (const { passive, value } of passives) {
      for (const effect of passive.effects) {
        if (effect.mode !== "flat" || effect.scope !== "self") continue;
        if (effect.conditions.length > 0) continue; // match-gated flats: unknown
        const delta = effect.direction === "decrease" ? -value : value;
        stats = { ...stats, [effect.baseStat]: stats[effect.baseStat] + delta };
      }
    }

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
        player == null ||
        expectedPosition == null ||
        player.position === expectedPosition ||
        player.altPosition === expectedPosition,
    };
  });

  // Team-scoped flat base passives (coach/manager/player "Team Kick +N").
  const starters = slots.filter((s) => s.kind === "pitch" && s.player !== null);
  const flatSources = slots.filter((s) => s.kind !== "bench" && s.passives.length > 0);
  for (const source of flatSources) {
    for (const { passive, value } of source.passives) {
      for (const effect of passive.effects) {
        if (effect.mode !== "flat" || effect.scope !== "team") continue;
        if (effect.conditions.length > 0) continue;
        const delta = effect.direction === "decrease" ? -value : value;
        for (const target of starters) {
          target.stats = {
            ...target.stats,
            [effect.baseStat]: target.stats[effect.baseStat] + delta,
          };
          target.total = totalOf(target.stats);
          target.power = computePower(target.stats);
        }
      }
    }
  }

  return {
    team,
    formation,
    slots,
    starters: slots.filter((s) => s.kind === "pitch" && s.player !== null),
  };
}
