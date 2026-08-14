import type { Team } from "@/domain/team";
import { decodeTeam, encodeTeam } from "./share";

/**
 * Teams are persisted as their share encoding rather than as raw JSON, so the
 * saved format and the link format cannot drift apart — and a version bump
 * invalidates both at once instead of leaving stale objects in localStorage.
 */

const SAVED_KEY = "kizuna.saved";
const CURRENT_KEY = "kizuna.current";

export interface SavedTeam {
  id: string;
  name: string;
  savedAt: string;
  encoded: string;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // Private browsing or a full quota — losing autosave is not worth a crash.
    return false;
  }
}

export interface StorageMutation<T> {
  value: T;
  persisted: boolean;
}

export function loadSavedTeams(): SavedTeam[] {
  return read<SavedTeam[]>(SAVED_KEY, []).filter((t) => typeof t?.encoded === "string");
}

export function saveTeam(team: Team): StorageMutation<SavedTeam[]> {
  const entry: SavedTeam = {
    id: crypto.randomUUID(),
    name: team.name,
    savedAt: new Date().toISOString(),
    encoded: encodeTeam(team),
  };

  // Saving under a name that already exists replaces it — the alternative is a
  // list that fills up with near-identical drafts.
  const next = [entry, ...loadSavedTeams().filter((t) => t.name !== team.name)];
  return { value: next, persisted: write(SAVED_KEY, next) };
}

export function deleteSavedTeam(id: string): StorageMutation<SavedTeam[]> {
  const next = loadSavedTeams().filter((t) => t.id !== id);
  return { value: next, persisted: write(SAVED_KEY, next) };
}

export function restoreSavedTeam(entry: SavedTeam): Team | null {
  return decodeTeam(entry.encoded);
}

export function saveCurrentTeam(team: Team): boolean {
  return write(CURRENT_KEY, encodeTeam(team));
}

export function loadCurrentTeam(): Team | null {
  const encoded = read<string | null>(CURRENT_KEY, null);
  return encoded ? decodeTeam(encoded) : null;
}
