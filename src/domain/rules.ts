import type { Player } from "./types";

/**
 * Match contexts whose roster rules materially differ.
 *
 * Seasonal status is the only tournament constraint the current dataset
 * cannot validate. Level-50 tables are available and drive stat resolution.
 */
export const RULESET_IDS = ["standard", "tournament"] as const;
export type RulesetId = (typeof RULESET_IDS)[number];

export interface Ruleset {
  id: RulesetId;
  maxHeroStarters: number;
  maxBasaraInSquad: number;
  uniqueCharacters: boolean;
  requiredSeasonalStarters: number | null;
  levelCap: number | null;
}

const RULESETS: Record<RulesetId, Ruleset> = {
  standard: {
    id: "standard",
    maxHeroStarters: 2,
    maxBasaraInSquad: 1,
    uniqueCharacters: false,
    requiredSeasonalStarters: null,
    levelCap: null,
  },
  tournament: {
    id: "tournament",
    maxHeroStarters: 2,
    maxBasaraInSquad: 1,
    uniqueCharacters: true,
    requiredSeasonalStarters: 5,
    levelCap: 50,
  },
};

export function findRuleset(id: string | undefined): Ruleset {
  return id && id in RULESETS ? RULESETS[id as RulesetId] : RULESETS.standard;
}

/**
 * Tournament uniqueness is about the character, not the database row. The
 * game contains several rows for some characters, so ids alone are too weak.
 */
export function characterIdentity(player: Player): string {
  return (player.nameOriginal || player.name).normalize("NFKC").trim().toLocaleLowerCase("en");
}
