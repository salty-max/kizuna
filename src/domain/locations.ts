import { LOCATION_KINDS, type GameLocation, type LocationKind } from "./types";

/**
 * Where to find a character in the game.
 *
 * The dump gives a character a flat list of location ids mixing two very
 * different things: Chronicle battles you replay, and Player Universe star
 * signs you roll. Presenting them as one list is misleading, so the domain
 * groups them and the UI renders the groups it is handed.
 */

interface FoundInEntry {
  /** The location shown — the first of its display name in sort order. */
  location: GameLocation;
  /**
   * Every id that displays under this name. The game ships one battle under
   * several ids (`…_010` / `…_110`), all sharing a single name, so listing them
   * one per id repeats the same line and reads like a bug.
   */
  ids: string[];
}

interface FoundInGroup {
  kind: LocationKind;
  entries: FoundInEntry[];
}

export interface FoundIn {
  groups: FoundInGroup[];
  /**
   * Ids the catalogue could not resolve. The data build fails on these, so this
   * should always be empty in practice — it exists so a stale or partial
   * catalogue degrades into an honest count instead of a silently short list.
   */
  unresolved: string[];
}

/** Locale-aware label, falling back across languages before giving up. */
export function locationDisplayName(
  location: GameLocation,
  locale: "fr" | "en" | "ja",
): string | null {
  return location.names[locale] || location.name || location.names.en || null;
}

/**
 * Resolve and group a player's `foundIn` ids.
 *
 * Matches come before star signs: a battle is a thing you can go and do, while
 * a star sign is a draw. Within a group, entries are sorted by their name in
 * the active locale so the list is stable and readable; unnamed locations sink
 * to the bottom rather than heading the list with a blank. Entries that display
 * under the same name are folded together, keeping every id.
 */
export function groupFoundIn(
  foundIn: readonly string[],
  locations: readonly GameLocation[],
  locale: "fr" | "en" | "ja",
): FoundIn {
  const byId = new Map(locations.map((location) => [location.id, location]));
  const resolved = new Map<LocationKind, GameLocation[]>();
  const unresolved: string[] = [];
  const seen = new Set<string>();

  for (const id of foundIn) {
    if (seen.has(id)) continue;
    seen.add(id);
    const location = byId.get(id);
    if (!location) {
      unresolved.push(id);
      continue;
    }
    const bucket = resolved.get(location.kind);
    if (bucket) bucket.push(location);
    else resolved.set(location.kind, [location]);
  }

  const collator = new Intl.Collator(locale);
  const groups: FoundInGroup[] = [];
  for (const kind of LOCATION_KINDS) {
    const bucket = resolved.get(kind);
    if (!bucket || bucket.length === 0) continue;

    bucket.sort((left, right) => {
      const leftName = locationDisplayName(left, locale);
      const rightName = locationDisplayName(right, locale);
      if (!leftName && !rightName) return left.id.localeCompare(right.id);
      if (!leftName) return 1;
      if (!rightName) return -1;
      return collator.compare(leftName, rightName) || left.id.localeCompare(right.id);
    });

    // Fold by display name, not by id. An unnamed location has no name to
    // share, so each one stays its own entry.
    const entries: FoundInEntry[] = [];
    const byName = new Map<string, FoundInEntry>();
    for (const location of bucket) {
      const name = locationDisplayName(location, locale);
      const existing = name === null ? undefined : byName.get(name);
      if (existing) {
        existing.ids.push(location.id);
        continue;
      }
      const entry: FoundInEntry = { location, ids: [location.id] };
      if (name !== null) byName.set(name, entry);
      entries.push(entry);
    }

    groups.push({ kind, entries });
  }

  return { groups, unresolved };
}
