import { POWER_KEYS, emptyPowerStats, type PowerKey, type PowerStats } from "./stats";
import type { ResolvedSlot, ResolvedTeam } from "./team";
import {
  MAX_BASARA_IN_SQUAD,
  MAX_HERO_STARTERS,
  PASSIVE_STATS,
  POWER_STAT_MAP,
  type PassiveCondition,
  type PassiveEffect,
  type PassiveStat,
  type Rarity,
} from "./types";

/**
 * Resolves every passive on the squad into concrete numbers.
 *
 * Two modelling decisions worth knowing, because the dataset does not settle
 * either one:
 *
 *  • **Allies include the carrier.** "Shot AT +% for players of the same
 *    element" reads as covering the holder too, so `alliesSameElement` and
 *    friends include the source slot. Flip `ALLY_SCOPES_INCLUDE_SELF` if the
 *    game turns out to disagree — it is the only place that assumption lives.
 *
 *  • **Percentages stack additively.** Two +10% passives give +20%, not +21%.
 *    This matches how the series has historically stacked modifiers.
 *
 * Effects are split into what always applies and what needs a condition to
 * hold, so the UI can show a floor and a ceiling instead of one number that
 * quietly assumes the best case.
 */
const ALLY_SCOPES_INCLUDE_SELF = true;

export interface Contribution {
  passiveId: string;
  description: string;
  fromSlotId: string;
  /** Localised name (Mark Evans). */
  fromPlayerName: string | null;
  /** Romanised original name (Endo Mamoru); may equal fromPlayerName. */
  fromPlayerNameOriginal: string | null;
  /** Signed: a `decrease` effect contributes a negative percentage. */
  percent: number;
  certainty: "always" | "conditional";
  conditions: PassiveCondition[];
  /** Set when the scope itself is situational rather than the conditions. */
  note?: ScopeNote;
}

export interface Modifier {
  /** Percent that always applies. */
  guaranteed: number;
  /** Extra percent once every condition holds. */
  conditional: number;
  contributions: Contribution[];
}

/** Stable codes — UI translates via i18n `unresolved.*`. */
export type UnresolvedReason =
  "selfNoPlayer" | "elementScopeNoPlayer" | "positionScopeNoPlayer" | "subbedOnPlayer";

/** Stable codes — UI translates via i18n `notes.*`. */
export type ScopeNote = "dependsOnMatchPlacement";

export interface UnresolvedPassive {
  passiveId: string;
  description: string;
  fromSlotId: string;
  reason: UnresolvedReason;
}

export interface SynergyResult {
  /** slotId → power stat → modifier. Only slots holding a player appear. */
  power: Map<string, Record<PowerKey, Modifier>>;
  /** Power stats with guaranteed modifiers applied. */
  effective: Map<string, PowerStats>;
  /** Power stats with guaranteed *and* conditional modifiers applied. */
  potential: Map<string, PowerStats>;
  /** Team-wide gauges — the passive stats with no per-player power equivalent. */
  gauges: Partial<Record<PassiveStat, Modifier>>;
  unresolved: UnresolvedPassive[];
  totals: { effective: PowerStats; potential: PowerStats };
}

/** Gauges where a decrease is the desirable outcome. */
export const LOWER_IS_BETTER: ReadonlySet<PassiveStat> = new Set<PassiveStat>([
  "foulRate",
  "bondLoss",
  "breachTensionRequirement",
  "tacticCooldown",
]);

export const GAUGE_STATS: PassiveStat[] = PASSIVE_STATS.filter(
  (stat) => POWER_STAT_MAP[stat] === undefined,
);

type ScopeResolution =
  | { kind: "targets"; slots: ResolvedSlot[]; note?: ScopeNote }
  | { kind: "unresolvable"; reason: UnresolvedReason };

function resolveScope(
  effect: PassiveEffect,
  source: ResolvedSlot,
  starters: ResolvedSlot[],
): ScopeResolution {
  const others = starters.filter((s) => s.slotId !== source.slotId);
  const withSelf = (matching: ResolvedSlot[]) =>
    ALLY_SCOPES_INCLUDE_SELF && starters.includes(source) && !matching.includes(source)
      ? [source, ...matching]
      : matching;

  switch (effect.scope) {
    case "team":
      return { kind: "targets", slots: starters };

    case "self":
      return source.player
        ? { kind: "targets", slots: [source] }
        : { kind: "unresolvable", reason: "selfNoPlayer" };

    case "alliedGK":
      return { kind: "targets", slots: starters.filter((s) => s.player?.position === "GK") };
    case "alliedDF":
      return { kind: "targets", slots: starters.filter((s) => s.player?.position === "DF") };
    case "alliedMF":
      return { kind: "targets", slots: starters.filter((s) => s.player?.position === "MF") };

    case "alliesSameElement":
    case "alliesDifferentElement": {
      const element = source.player?.element;
      if (!element) {
        return {
          kind: "unresolvable",
          reason: "elementScopeNoPlayer",
        };
      }
      const same = effect.scope === "alliesSameElement";
      const matching = others.filter((s) =>
        same ? s.player?.element === element : s.player?.element !== element,
      );
      return { kind: "targets", slots: same ? withSelf(matching) : matching };
    }

    case "alliesSamePosition":
    case "alliesDifferentPosition": {
      const position = source.player?.position;
      if (!position) {
        return {
          kind: "unresolvable",
          reason: "positionScopeNoPlayer",
        };
      }
      const same = effect.scope === "alliesSamePosition";
      const matching = others.filter((s) =>
        same ? s.player?.position === position : s.player?.position !== position,
      );
      return { kind: "targets", slots: same ? withSelf(matching) : matching };
    }

    case "nearbyAllies":
      // Depends on live positioning, which a static builder cannot know. Count
      // it against the whole squad but never as guaranteed.
      return {
        kind: "targets",
        slots: starters,
        note: "dependsOnMatchPlacement",
      };

    case "subbedOnPlayer":
      return {
        kind: "unresolvable",
        reason: "subbedOnPlayer",
      };
  }
}

function emptyModifier(): Modifier {
  return { guaranteed: 0, conditional: 0, contributions: [] };
}

function emptyPowerModifiers(): Record<PowerKey, Modifier> {
  return {
    shootAT: emptyModifier(),
    focusAT: emptyModifier(),
    focusDF: emptyModifier(),
    wallDF: emptyModifier(),
    scrambleAT: emptyModifier(),
    scrambleDF: emptyModifier(),
    kp: emptyModifier(),
  };
}

function record(modifier: Modifier, contribution: Contribution) {
  modifier.contributions.push(contribution);
  if (contribution.certainty === "always") modifier.guaranteed += contribution.percent;
  else modifier.conditional += contribution.percent;
}

function applyPercent(
  base: PowerStats,
  modifiers: Record<PowerKey, Modifier>,
  includeConditional: boolean,
): PowerStats {
  const out = emptyPowerStats();
  for (const key of POWER_KEYS) {
    const m = modifiers[key];
    const percent = m.guaranteed + (includeConditional ? m.conditional : 0);
    out[key] = Math.round(base[key] * (1 + percent / 100));
  }
  return out;
}

export function computeSynergy(resolved: ResolvedTeam): SynergyResult {
  const { slots, starters } = resolved;

  const power = new Map<string, Record<PowerKey, Modifier>>();
  for (const slot of starters) power.set(slot.slotId, emptyPowerModifiers());

  const gauges: Partial<Record<PassiveStat, Modifier>> = {};
  const unresolved: UnresolvedPassive[] = [];

  // Bench slots carry passives that only matter once the player comes on, so
  // they are deliberately not a source here. Coach and managers are.
  const sources = slots.filter((s) => s.kind !== "bench" && s.passives.length > 0);

  for (const source of sources) {
    for (const { passive, value } of source.passives) {
      for (const effect of passive.effects) {
        const resolution = resolveScope(effect, source, starters);

        if (resolution.kind === "unresolvable") {
          unresolved.push({
            passiveId: passive.id,
            description: passive.description,
            fromSlotId: source.slotId,
            reason: resolution.reason,
          });
          continue;
        }

        const percent = effect.direction === "decrease" ? -value : value;
        const conditional = effect.conditions.length > 0 || resolution.note !== undefined;

        const contribution: Contribution = {
          passiveId: passive.id,
          description: passive.description,
          fromSlotId: source.slotId,
          fromPlayerName: source.player?.name ?? null,
          fromPlayerNameOriginal: source.player?.nameOriginal || source.player?.name || null,
          percent,
          certainty: conditional ? "conditional" : "always",
          conditions: effect.conditions,
          note: resolution.note,
        };

        const powerKeys = POWER_STAT_MAP[effect.stat];

        if (powerKeys) {
          for (const target of resolution.slots) {
            const modifiers = power.get(target.slotId);
            if (!modifiers) continue;
            for (const key of powerKeys) record(modifiers[key], { ...contribution });
          }
        } else {
          // A gauge — team-level, so it is counted once regardless of how many
          // players the scope covers.
          const modifier = (gauges[effect.stat] ??= emptyModifier());
          record(modifier, { ...contribution });
        }
      }
    }
  }

  const effective = new Map<string, PowerStats>();
  const potential = new Map<string, PowerStats>();
  const totalEffective = emptyPowerStats();
  const totalPotential = emptyPowerStats();

  for (const slot of starters) {
    const modifiers = power.get(slot.slotId) ?? emptyPowerModifiers();
    const slotEffective = applyPercent(slot.power, modifiers, false);
    const slotPotential = applyPercent(slot.power, modifiers, true);
    effective.set(slot.slotId, slotEffective);
    potential.set(slot.slotId, slotPotential);
    for (const key of POWER_KEYS) {
      totalEffective[key] += slotEffective[key];
      totalPotential[key] += slotPotential[key];
    }
  }

  return {
    power,
    effective,
    potential,
    gauges,
    unresolved,
    totals: { effective: totalEffective, potential: totalPotential },
  };
}

/* ── Squad-shape read-outs ────────────────────────────────────────────────── */

/** Stable codes — UI translates via i18n `violations.*`. */
export type Violation =
  | { code: "heroLimit"; count: number; max: number }
  | { code: "basaraLimit"; count: number; max: number };

export interface SquadShape {
  elements: { element: string; count: number }[];
  positions: { position: string; count: number }[];
  buildTypes: { buildType: string; count: number }[];
  rarities: { rarity: Rarity; count: number }[];
  outOfPosition: ResolvedSlot[];
  /** Game limits that the current squad breaks. */
  violations: Violation[];
  filled: number;
  capacity: number;
}

export function squadShape(resolved: ResolvedTeam): SquadShape {
  const pitch = resolved.slots.filter((s) => s.kind === "pitch");
  const tally = <T extends string>(values: (T | undefined)[]) => {
    const counts = new Map<T, number>();
    for (const value of values) {
      if (value === undefined) continue;
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return [...counts].sort((a, b) => b[1] - a[1]);
  };

  // Hero is capped on the pitch; Basara is capped across the whole squad, so
  // the two are counted over different populations on purpose.
  const heroStarters = resolved.starters.filter((s) => s.rarity === "hero").length;
  const basaraInSquad = resolved.slots.filter(
    (s) => s.player !== null && s.rarity === "basara",
  ).length;

  const violations: Violation[] = [];
  if (heroStarters > MAX_HERO_STARTERS) {
    violations.push({ code: "heroLimit", count: heroStarters, max: MAX_HERO_STARTERS });
  }
  if (basaraInSquad > MAX_BASARA_IN_SQUAD) {
    violations.push({ code: "basaraLimit", count: basaraInSquad, max: MAX_BASARA_IN_SQUAD });
  }

  return {
    violations,
    rarities: tally(resolved.starters.map((s) => s.rarity)).map(([rarity, count]) => ({
      rarity,
      count,
    })),
    elements: tally(resolved.starters.map((s) => s.player?.element)).map(([element, count]) => ({
      element,
      count,
    })),
    positions: tally(resolved.starters.map((s) => s.player?.position)).map(([position, count]) => ({
      position,
      count,
    })),
    // The slot's effective archetype, not the dataset's — the two differ
    // whenever the user has overridden it.
    buildTypes: tally(resolved.starters.map((s) => s.buildType ?? undefined)).map(
      ([buildType, count]) => ({ buildType, count }),
    ),
    outOfPosition: resolved.starters.filter((s) => !s.positionMatch),
    filled: resolved.starters.length,
    capacity: pitch.length,
  };
}
