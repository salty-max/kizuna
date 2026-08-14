import { BUILD_TYPES, type BuildType } from "./types";

const MAX_BUILD_RANK = 5;
export const BUILD_RANKS = [0, 1, 2, 3, 4, 5] as const;
export type BuildRank = (typeof BUILD_RANKS)[number];

export function normalizeBuildRank(value: number | undefined): BuildRank {
  const rounded = Math.round(Number.isFinite(value) ? (value ?? 0) : 0);
  return Math.min(MAX_BUILD_RANK, Math.max(0, rounded)) as BuildRank;
}

export function isBuildType(value: string | null | undefined): value is BuildType {
  return value != null && BUILD_TYPES.includes(value as BuildType);
}
