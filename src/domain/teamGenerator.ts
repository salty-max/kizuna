import type { OptimizationDecision, OptimizationReport } from "./fillBest";
import {
  BENCH_SLOT_IDS,
  COACH_SLOT_ID,
  FORMATIONS,
  MANAGER_SLOT_IDS,
  findFormation,
  type Formation,
} from "./formations";
import { characterIdentity } from "./rules";
import { computePower, totalOf, type PowerStats } from "./stats";
import {
  applyFormation,
  allSlotIds,
  clearTeamAssignments,
  emptyAssignment,
  filledAssignment,
  type SlotKind,
  type Team,
} from "./team";
import {
  MAX_BASARA_IN_SQUAD,
  MAX_HERO_STARTERS,
  type BuildType,
  type Dataset,
  type Element,
  type Player,
  type Position,
  type Rarity,
  type Role,
} from "./types";

export const GENERATION_GOALS = ["competitive", "tournament", "pve"] as const;
export type GenerationGoal = (typeof GENERATION_GOALS)[number];

export const GENERATION_PLAYSTYLES = [
  "auto",
  "stable",
  "counter",
  "tension",
  "bond",
  "aggressive",
] as const;
export type GenerationPlaystyle = (typeof GENERATION_PLAYSTYLES)[number];

const GENERATION_PROFILES = ["safe", "balanced", "offensive"] as const;
type GenerationProfile = (typeof GENERATION_PROFILES)[number];

export interface TeamGenerationOptions {
  goal: GenerationGoal;
  playstyle: GenerationPlaystyle;
  formationId: "auto" | string;
  allowAlternatePositions: boolean;
  preserveExisting: boolean;
}

interface GenerationMetrics {
  starters: number;
  primaryPositions: number;
  alternatePositions: number;
  heroStarters: number;
  basaraCount: number;
  buildMatches: number;
  elements: number;
  reserveKeeper: boolean;
  estimatedPower: number;
}

export interface GeneratedTeamCandidate {
  id: GenerationProfile;
  primaryBuild: BuildType;
  secondaryBuild: BuildType;
  team: Team;
  report: OptimizationReport;
  metrics: GenerationMetrics;
}

interface ProfilePolicy {
  id: GenerationProfile;
  primaryBuild: BuildType;
  secondaryBuild: BuildType;
  formationId: string;
  offense: number;
  defense: number;
  buildWeight: number;
}

const AUTO_FORMATIONS: Record<GenerationGoal, Record<GenerationProfile, string>> = {
  competitive: {
    safe: "4-4-2-diamond",
    balanced: "4-3-3-triangle",
    offensive: "4-3-3-delta",
  },
  tournament: {
    safe: "4-4-2-box",
    balanced: "4-3-3-triangle",
    offensive: "3-6-1-hexa",
  },
  pve: {
    safe: "5-4-1-double-volante",
    balanced: "4-3-3-delta",
    offensive: "3-6-1-hexa",
  },
};

function primaryBuildFor(playstyle: GenerationPlaystyle, profile: GenerationProfile): BuildType {
  if (playstyle === "stable") return "justice";
  if (playstyle === "counter") return "counter";
  if (playstyle === "tension") return "tension";
  if (playstyle === "bond") return "bond";
  if (playstyle === "aggressive") return "roughPlay";
  if (profile === "safe") return "justice";
  if (profile === "balanced") return "counter";
  return "bond";
}

function secondaryBuildFor(primary: BuildType, profile: GenerationProfile): BuildType {
  const preferred: Record<GenerationProfile, BuildType> = {
    safe: "justice",
    balanced: "tension",
    offensive: "counter",
  };
  if (preferred[profile] !== primary) return preferred[profile];
  if (primary !== "tension") return "tension";
  return "counter";
}

function policyFor(
  goal: GenerationGoal,
  playstyle: GenerationPlaystyle,
  formationId: TeamGenerationOptions["formationId"],
  profile: GenerationProfile,
): ProfilePolicy {
  const primaryBuild = primaryBuildFor(playstyle, profile);
  return {
    id: profile,
    primaryBuild,
    secondaryBuild: secondaryBuildFor(primaryBuild, profile),
    formationId: formationId === "auto" ? AUTO_FORMATIONS[goal][profile] : formationId,
    offense: profile === "offensive" ? 1.35 : profile === "balanced" ? 1.1 : 0.9,
    defense: profile === "safe" ? 1.35 : profile === "balanced" ? 1.1 : 0.9,
    buildWeight: profile === "balanced" ? 1.2 : 1.15,
  };
}

function positionCompatible(player: Player, position: Position, allowAlternate: boolean): boolean {
  return player.position === position || (allowAlternate && player.altPosition === position);
}

function roleScore(power: PowerStats, position: Position, policy: ProfilePolicy): number {
  switch (position) {
    case "GK":
      return power.kp * 1.5 * policy.defense + power.wallDF + power.scrambleDF;
    case "DF":
      return (
        (power.wallDF * 1.7 + power.focusDF + power.scrambleDF) * policy.defense +
        power.focusAT * 0.2 * policy.offense
      );
    case "MF":
      return (
        (power.focusAT + power.scrambleAT) * policy.offense +
        (power.focusDF + power.scrambleDF) * policy.defense
      );
    case "FW":
      return (
        (power.shootAT * 2 + power.focusAT + power.scrambleAT) * policy.offense +
        power.focusDF * 0.15 * policy.defense
      );
  }
}

function playerScore(
  player: Player,
  position: Position | null,
  policy: ProfilePolicy,
  level: 50 | 99,
  selectedElements: ReadonlyMap<Element, number>,
): number {
  const stats = level === 50 ? player.statsLv50 : player.stats;
  let score = position ? roleScore(computePower(stats), position, policy) : totalOf(stats);

  if (position && player.position === position) score *= 1.08;
  else if (position && player.altPosition === position) score *= 0.98;

  if (player.buildType === policy.primaryBuild) score *= policy.buildWeight;
  else if (player.buildType === policy.secondaryBuild) score *= 1.08;

  // Element diversity is a tie-breaker, not a reason to pick a weak player.
  const elementCount = selectedElements.get(player.element) ?? 0;
  score *= elementCount === 0 ? 1.025 : elementCount >= 3 ? 0.99 : 1;
  return score;
}

function usedRoster(team: Team, playersById: ReadonlyMap<number, Player>) {
  const ids = new Set<number>();
  const identities = new Set<string>();
  for (const assignment of Object.values(team.slots)) {
    if (assignment.playerId == null) continue;
    ids.add(assignment.playerId);
    const player = playersById.get(assignment.playerId);
    if (player) identities.add(characterIdentity(player));
  }
  return { ids, identities };
}

function addElement(elements: Map<Element, number>, player: Player) {
  elements.set(player.element, (elements.get(player.element) ?? 0) + 1);
}

function choosePlayer(
  players: readonly Player[],
  usedIds: ReadonlySet<number>,
  usedIdentities: ReadonlySet<string>,
  elements: ReadonlyMap<Element, number>,
  policy: ProfilePolicy,
  level: 50 | 99,
  position: Position | null,
  allowAlternate: boolean,
  role: Role | null = "Player",
): Player | null {
  let best: Player | null = null;
  let bestScore = -Infinity;

  for (const player of players) {
    if (usedIds.has(player.id) || usedIdentities.has(characterIdentity(player))) continue;
    if (role && player.role !== role) continue;
    if (position && !positionCompatible(player, position, allowAlternate)) continue;
    const score = playerScore(player, position, policy, level, elements);
    if (score > bestScore || (score === bestScore && player.id < (best?.id ?? Infinity))) {
      best = player;
      bestScore = score;
    }
  }
  return best;
}

function decisionFor(
  slotId: string,
  kind: SlotKind,
  position: Position | null,
  player: Player,
  policy: ProfilePolicy,
): OptimizationDecision {
  const reasons: OptimizationDecision["reasons"] = [];
  if (player.buildType === policy.primaryBuild || player.buildType === policy.secondaryBuild) {
    reasons.push("teamBuild");
  }
  if (position) {
    reasons.push(player.position === position ? "naturalPosition" : "alternatePosition");
    reasons.push("rolePower");
  } else if (kind === "bench") {
    reasons.push("totalStats");
  } else {
    reasons.push("staffRole", "teamBuild", "totalStats");
  }
  return {
    slotId,
    slotKind: kind,
    expectedPosition: position,
    playerId: player.id,
    reasons: [...new Set(reasons)],
  };
}

function startingTeam(
  base: Team,
  formation: Formation,
  dataset: Dataset,
  options: TeamGenerationOptions,
): Team {
  const rulesetId = options.goal === "tournament" ? "tournament" : "standard";
  if (!options.preserveExisting) {
    const empty = clearTeamAssignments(applyFormation(base, formation.id, dataset.players));
    return { ...empty, rulesetId };
  }
  const formed = applyFormation(base, formation.id, dataset.players);
  return {
    ...sanitizePreservedRoster(formed, formation, dataset.players, options.allowAlternatePositions),
    rulesetId,
  };
}

/**
 * Existing choices are a preference, never an excuse to return an illegal
 * proposal. Keep one variant per character and move incompatible starters to
 * a compatible empty post, then to the bench when no such post is available.
 */
function sanitizePreservedRoster(
  team: Team,
  formation: Formation,
  players: readonly Player[],
  allowAlternate: boolean,
): Team {
  const playersById = new Map(players.map((player) => [player.id, player]));
  const slots = { ...team.slots };
  const identities = new Set<string>();

  for (const slotId of allSlotIds(formation)) {
    const assignment = slots[slotId] ?? emptyAssignment();
    const selected =
      assignment.playerId == null ? null : (playersById.get(assignment.playerId) ?? null);
    if (!selected || identities.has(characterIdentity(selected))) {
      slots[slotId] = emptyAssignment();
      continue;
    }
    identities.add(characterIdentity(selected));
  }

  const displaced = formation.slots.flatMap((slot) => {
    const assignment = slots[slot.id] ?? emptyAssignment();
    const selected =
      assignment.playerId == null ? null : (playersById.get(assignment.playerId) ?? null);
    if (!selected || positionCompatible(selected, slot.position, allowAlternate)) return [];
    slots[slot.id] = emptyAssignment();
    return [{ assignment, player: selected }];
  });

  for (const { assignment, player } of displaced) {
    const compatible = formation.slots.find(
      (slot) =>
        slots[slot.id]?.playerId == null &&
        positionCompatible(player, slot.position, allowAlternate),
    );
    const target =
      compatible?.id ?? BENCH_SLOT_IDS.find((slotId) => slots[slotId]?.playerId == null);
    if (target) slots[target] = assignment;
  }

  return { ...team, slots };
}

function fillCandidate(
  base: Team,
  dataset: Dataset,
  options: TeamGenerationOptions,
  policy: ProfilePolicy,
): GeneratedTeamCandidate {
  const formation = findFormation(policy.formationId);
  const playersById = new Map(dataset.players.map((player) => [player.id, player]));
  const level: 50 | 99 = options.goal === "tournament" ? 50 : 99;
  const initial = startingTeam(base, formation, dataset, options);
  const team: Team = {
    ...initial,
    formationId: formation.id,
    teamBuildType: policy.primaryBuild,
    slots: { ...initial.slots },
  };
  const { ids: usedIds, identities: usedIdentities } = usedRoster(team, playersById);
  const elements = new Map<Element, number>();
  for (const slot of formation.slots) {
    const existing = team.slots[slot.id];
    const player = existing?.playerId == null ? null : (playersById.get(existing.playerId) ?? null);
    if (player) addElement(elements, player);
  }
  const decisions: OptimizationDecision[] = [];

  const assign = (slotId: string, kind: SlotKind, position: Position | null, player: Player) => {
    team.slots[slotId] = filledAssignment(player.id, { buildType: player.buildType });
    usedIds.add(player.id);
    usedIdentities.add(characterIdentity(player));
    if (kind === "pitch") addElement(elements, player);
    decisions.push(decisionFor(slotId, kind, position, player, policy));
  };

  // Hard constraint: every generated starter must match their primary or,
  // when explicitly allowed, secondary position. There is no fallback pass.
  for (const slot of formation.slots) {
    if ((team.slots[slot.id] ?? emptyAssignment()).playerId != null) continue;
    const player = choosePlayer(
      dataset.players,
      usedIds,
      usedIdentities,
      elements,
      policy,
      level,
      slot.position,
      options.allowAlternatePositions,
    );
    if (player) assign(slot.id, "pitch", slot.position, player);
  }

  // Bench is coverage, not a passive warehouse: GK, DF, MF, FW, then utility.
  const benchNeeds: Array<Position | null> = ["GK", "DF", "MF", "FW", null];
  BENCH_SLOT_IDS.forEach((slotId, index) => {
    if ((team.slots[slotId] ?? emptyAssignment()).playerId != null) return;
    const position = benchNeeds[index] ?? null;
    const player = choosePlayer(
      dataset.players,
      usedIds,
      usedIdentities,
      elements,
      policy,
      level,
      position,
      options.allowAlternatePositions,
    );
    if (player) assign(slotId, "bench", position, player);
  });

  const staffSlots: Array<{ id: string; kind: SlotKind; role: Role }> = [
    { id: COACH_SLOT_ID, kind: "coach", role: "Coach" },
    ...MANAGER_SLOT_IDS.map((id) => ({ id, kind: "manager" as const, role: "Manager" as const })),
  ];
  for (const staff of staffSlots) {
    if ((team.slots[staff.id] ?? emptyAssignment()).playerId != null) continue;
    const player =
      choosePlayer(
        dataset.players,
        usedIds,
        usedIdentities,
        elements,
        policy,
        level,
        null,
        true,
        staff.role,
      ) ??
      choosePlayer(
        dataset.players,
        usedIds,
        usedIdentities,
        elements,
        policy,
        level,
        null,
        true,
        null,
      );
    if (player) assign(staff.id, staff.kind, null, player);
  }

  applySpecialRarities(
    team,
    formation,
    dataset.players,
    playersById,
    policy,
    level,
    options.allowAlternatePositions,
    !options.preserveExisting,
    decisions,
  );

  const starters = formation.slots.flatMap((slot) => {
    const id = team.slots[slot.id]?.playerId;
    const player = id == null ? null : (playersById.get(id) ?? null);
    return player ? [{ slot, player }] : [];
  });
  const primaryPositions = starters.filter(
    ({ slot, player }) => player.position === slot.position,
  ).length;
  const alternatePositions = starters.filter(
    ({ slot, player }) => player.position !== slot.position && player.altPosition === slot.position,
  ).length;
  const activeIds = [
    ...formation.slots.map((slot) => team.slots[slot.id]?.playerId),
    team.slots[COACH_SLOT_ID]?.playerId,
    ...MANAGER_SLOT_IDS.map((id) => team.slots[id]?.playerId),
  ];
  const activePlayers = activeIds.flatMap((id) => {
    const player = id == null ? null : (playersById.get(id) ?? null);
    return player ? [player] : [];
  });
  const estimatedPower = Math.round(
    starters.reduce(
      (sum, { slot, player }) =>
        sum +
        roleScore(
          computePower(level === 50 ? player.statsLv50 : player.stats),
          slot.position,
          policy,
        ),
      0,
    ),
  );
  const reserveKeeper = BENCH_SLOT_IDS.some((id) => {
    const playerId = team.slots[id]?.playerId;
    const player = playerId == null ? null : playersById.get(playerId);
    return player?.position === "GK" || player?.altPosition === "GK";
  });

  return {
    id: policy.id,
    primaryBuild: policy.primaryBuild,
    secondaryBuild: policy.secondaryBuild,
    team,
    report: {
      decisions,
      rarity: "legendary",
      preservesExisting: options.preserveExisting,
      uniqueCharacters: true,
    },
    metrics: {
      starters: starters.length,
      primaryPositions,
      alternatePositions,
      heroStarters: starters.filter(({ slot }) => team.slots[slot.id]?.rarity === "hero").length,
      basaraCount: allSlotIds(formation).filter(
        (slotId) => team.slots[slotId]?.playerId != null && team.slots[slotId]?.rarity === "basara",
      ).length,
      buildMatches: activePlayers.filter(
        (player) =>
          player.buildType === policy.primaryBuild || player.buildType === policy.secondaryBuild,
      ).length,
      elements: new Set(starters.map(({ player }) => player.element)).size,
      reserveKeeper,
      estimatedPower,
    },
  };
}

function specialFormScore(
  player: Player,
  position: Position,
  rarity: Extract<Rarity, "hero" | "basara">,
  policy: ProfilePolicy,
  level: 50 | 99,
): number {
  const form = rarity === "hero" ? player.heroStats : player.basaraStats;
  if (!form) return -Infinity;
  let score = roleScore(computePower(form[`lv${level}`]), position, policy);
  if (player.buildType === policy.primaryBuild) score *= policy.buildWeight;
  else if (player.buildType === policy.secondaryBuild) score *= 1.08;
  return score;
}

/**
 * Spend the legal competitive rarity budget on the starting eleven. Only real
 * datamined forms are considered: the generator never invents a Hero/Basara
 * table from the fallback ratios used by the manual editor.
 */
function applySpecialRarities(
  team: Team,
  formation: Formation,
  players: readonly Player[],
  playersById: ReadonlyMap<number, Player>,
  policy: ProfilePolicy,
  level: 50 | 99,
  allowAlternate: boolean,
  allowReplacement: boolean,
  decisions: OptimizationDecision[],
) {
  const starters = () =>
    formation.slots.flatMap((slot) => {
      const assignment = team.slots[slot.id];
      const player =
        assignment?.playerId == null ? null : (playersById.get(assignment.playerId) ?? null);
      return assignment && player ? [{ slot, assignment, player }] : [];
    });
  const existingBasara = allSlotIds(formation).filter(
    (slotId) => team.slots[slotId]?.playerId != null && team.slots[slotId]?.rarity === "basara",
  ).length;
  const existingHeroes = starters().filter(({ assignment }) => assignment.rarity === "hero").length;

  const promote = (rarity: Extract<Rarity, "hero" | "basara">) => {
    const candidate = starters()
      .filter(({ slot, player }) => {
        if (team.slots[slot.id]?.rarity !== "legendary") return false;
        if (rarity === "hero") return Boolean(player.heroStats && player.buildType);
        return Boolean(player.basaraStats);
      })
      .map((entry) => ({
        ...entry,
        score: specialFormScore(entry.player, entry.slot.position, rarity, policy, level),
      }))
      .sort((a, b) => b.score - a.score || a.player.id - b.player.id)[0];
    if (!candidate) return false;
    team.slots[candidate.slot.id] = { ...team.slots[candidate.slot.id]!, rarity };
    return true;
  };

  const replaceWithSpecialForm = (rarity: Extract<Rarity, "hero" | "basara">) => {
    if (!allowReplacement) return false;
    const { ids: usedIds, identities: usedIdentities } = usedRoster(team, playersById);
    let best:
      | {
          slot: Formation["slots"][number];
          player: Player;
          score: number;
        }
      | undefined;

    for (const { slot, assignment, player: current } of starters()) {
      if (assignment.rarity !== "legendary") continue;
      const currentScore = roleScore(
        computePower(level === 50 ? current.statsLv50 : current.stats),
        slot.position,
        policy,
      );
      for (const player of players) {
        if (player.role !== "Player") continue;
        if (usedIds.has(player.id) || usedIdentities.has(characterIdentity(player))) continue;
        if (!positionCompatible(player, slot.position, allowAlternate)) continue;
        if (rarity === "hero" ? !player.heroStats || !player.buildType : !player.basaraStats) {
          continue;
        }
        const score = specialFormScore(player, slot.position, rarity, policy, level) - currentScore;
        if (!best || score > best.score || (score === best.score && player.id < best.player.id)) {
          best = { slot, player, score };
        }
      }
    }

    if (!best) return false;
    team.slots[best.slot.id] = filledAssignment(best.player.id, {
      buildType: best.player.buildType,
      rarity,
    });
    const decisionIndex = decisions.findIndex((decision) => decision.slotId === best.slot.id);
    if (decisionIndex >= 0) {
      decisions[decisionIndex] = decisionFor(
        best.slot.id,
        "pitch",
        best.slot.position,
        best.player,
        policy,
      );
    }
    return true;
  };

  if (existingBasara < MAX_BASARA_IN_SQUAD && !promote("basara")) {
    replaceWithSpecialForm("basara");
  }
  for (let count = existingHeroes; count < MAX_HERO_STARTERS; count++) {
    if (!promote("hero") && !replaceWithSpecialForm("hero")) break;
  }
}

/** Three deterministic, legal roster proposals from the same brief. */
export function generateTeamCandidates(
  base: Team,
  dataset: Dataset,
  options: TeamGenerationOptions,
): GeneratedTeamCandidate[] {
  return GENERATION_PROFILES.map((profile) =>
    fillCandidate(
      base,
      dataset,
      options,
      policyFor(options.goal, options.playstyle, options.formationId, profile),
    ),
  );
}

export function availableGenerationFormations(): Formation[] {
  return FORMATIONS;
}
