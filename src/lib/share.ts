import { deflateSync, inflateSync } from "fflate";

import { findFormation } from "@/domain/formations";
import {
  MAX_SLOT_PASSIVES,
  allSlotIds,
  emptyAssignment,
  normalizeTeam,
  type SlotAssignment,
  type Team,
} from "@/domain/team";
import {
  BUILD_TYPES,
  EQUIPMENT_SLOTS,
  MAX_TEAM_TACTICS,
  RARITIES,
  type EquipmentSlot,
} from "@/domain/types";

/**
 * Compact, hand-rolled encoding of a team for the URL hash.
 *
 * Deliberately not JSON+base64: a full squad with equipment and passives runs
 * to a few kilobytes of JSON, which is past what browsers and chat clients
 * handle comfortably in a URL. This gets a filled 4-4-2 down to roughly 400
 * characters, and stays readable enough to debug by eye.
 *
 *   4~<formation>~<name>~<slot>|<slot>|…
 *
 * Slots appear in `allSlotIds()` order, so their ids never need encoding.
 * Each slot is `playerId,rarity,b,p,c,m,pa0,…,pa5,buildType` — the rarity's
 * index (blank for Common, the default), equipment game string ids
 * (`eq_sh…`), passives as `<stringId>*<value>` (game `string_id`), and a
 * 1-based archetype override (blank inherits the dataset's). Empty means unset.
 *
 * The version prefix is load-bearing: bump it when the layout changes so old
 * links fail cleanly instead of decoding into a wrong squad.
 * v1 pre-rarity · v2 community ids · v3 dataminer players · v4 dataminer passives
 * · v5 team tactics.
 */
const VERSION = "5";

function encodeSlot(assignment: SlotAssignment): string {
  const rarityIndex = RARITIES.indexOf(assignment.rarity ?? "common");

  const fields: string[] = [
    assignment.playerId != null ? String(assignment.playerId) : "",
    // Normal is the default, so leave it blank and save a character per slot.
    rarityIndex > 0 ? String(rarityIndex) : "",
  ];

  for (const slot of EQUIPMENT_SLOTS) {
    // Game string ids (`eq_sh071101`) — the slot is implied by field position.
    fields.push(assignment.equipment[slot] ?? "");
  }

  for (let i = 0; i < MAX_SLOT_PASSIVES; i++) {
    const passive = assignment.passives[i];
    // Game string ids (`mps10003_01`, `ps10001`, …) — no separator chars.
    fields.push(passive?.passiveId ? `${passive.passiveId}*${passive.value}` : "");
  }

  // Appended last, on purpose: a field added at the end is backwards
  // compatible, so this needed no version bump. Stored 1-based so that blank —
  // the common "inherit from the dataset" case — is unambiguous.
  const buildTypeIndex = assignment.buildType ? BUILD_TYPES.indexOf(assignment.buildType) + 1 : 0;
  fields.push(buildTypeIndex > 0 ? String(buildTypeIndex) : "");

  // Ajouté en fin de champs, donc rétrocompatible : un lien antérieur décode
  // sans branche alternative, ce qui est bien la valeur par défaut.
  fields.push(assignment.altBranch ? "1" : "");

  // Trailing empties carry no information.
  while (fields.length > 0 && fields[fields.length - 1] === "") fields.pop();
  return fields.join(",");
}

function decodeSlot(encoded: string): SlotAssignment {
  const assignment = emptyAssignment();
  if (encoded === "") return assignment;

  const fields = encoded.split(",");

  const playerId = Number(fields[0]);
  assignment.playerId = fields[0] !== "" && Number.isFinite(playerId) ? playerId : null;

  const rarity = RARITIES[Number(fields[1])];
  if (fields[1] && rarity) assignment.rarity = rarity;

  EQUIPMENT_SLOTS.forEach((slot: EquipmentSlot, index) => {
    const raw = fields[2 + index];
    if (raw) assignment.equipment[slot] = raw;
  });

  for (let i = 0; i < MAX_SLOT_PASSIVES; i++) {
    const raw = fields[2 + EQUIPMENT_SLOTS.length + i];
    if (!raw) continue;
    const separator = raw.lastIndexOf("*");
    if (separator === -1) continue;
    const value = Number(raw.slice(separator + 1));
    assignment.passives[i] = {
      passiveId: raw.slice(0, separator),
      value: Number.isFinite(value) ? value : 0,
    };
  }

  const tail = 2 + EQUIPMENT_SLOTS.length + MAX_SLOT_PASSIVES;
  const buildType = BUILD_TYPES[Number(fields[tail]) - 1];
  if (buildType) assignment.buildType = buildType;
  if (fields[tail + 1] === "1") assignment.altBranch = true;

  return assignment;
}

export function encodeTeam(team: Team): string {
  const formation = findFormation(team.formationId);
  const slots = allSlotIds(formation)
    .map((id) => encodeSlot(team.slots[id] ?? emptyAssignment()))
    .join("|")
    // Empty trailing slots are the common case for bench and staff.
    .replace(/\|+$/, "");

  // encodeURIComponent leaves `~` alone, and `~` is our field separator — so
  // escape it by hand or any team name containing one splits the payload.
  const name = encodeURIComponent(team.name).replace(/~/g, "%7E");

  // Tactic string ids are already URL-safe (`wht10080`); comma-join, no encode.
  const tactics = team.tacticIds.filter(Boolean).slice(0, MAX_TEAM_TACTICS).join(",");

  return [VERSION, formation.id, name, tactics, slots].join("~");
}

export function decodeTeam(encoded: string): Team | null {
  const parts = encoded.split("~");
  if (parts.length < 5 || parts[0] !== VERSION) return null;

  const formation = findFormation(parts[1]!);
  // findFormation falls back to the default, which would silently reshape a
  // squad built on a formation we no longer ship. Refuse instead.
  if (formation.id !== parts[1]) return null;

  let name: string;
  try {
    name = decodeURIComponent(parts[2]!);
  } catch {
    return null;
  }

  const tacticIds = parts[3]!
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, MAX_TEAM_TACTICS);

  const encodedSlots = parts.slice(4).join("~").split("|");
  const ids = allSlotIds(formation);
  const slots: Record<string, SlotAssignment> = {};

  ids.forEach((id, index) => {
    slots[id] = decodeSlot(encodedSlots[index] ?? "");
  });

  // Empty name is fine — the UI substitutes a locale-aware default on display.
  return normalizeTeam({ name, formationId: formation.id, tacticIds, slots });
}

/**
 * Share code for humans — not a URL.
 *
 * The raw `encodeTeam` payload is fine for localStorage and debugging, but a
 * full squad is ~1–2 KB of commas and pipe bars. We deflate it and base64url
 * the result so people paste something like `KZ1.tVXLjt…` into chat / Discord.
 *
 *   KZ1.<base64url(deflate(raw encodeTeam payload))>
 *
 * Import accepts: that code, a bare raw payload, or a full URL with `#c=` / `#t=`.
 */
const CODE_PREFIX = "KZ1.";
const HASH_CODE = "#c=";
/** Legacy uncompressed hash — still decoded on open. */
const HASH_RAW = "#t=";

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(b64url: string): Uint8Array | null {
  try {
    const padded = b64url.replace(/-/g, "+").replace(/_/g, "/");
    const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
    const binary = atob(padded + pad);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

/** Human-facing share code (`KZ1.…`). Prefer this over raw URLs. */
export function encodeShareCode(team: Team): string {
  const raw = encodeTeam(team);
  const compressed = deflateSync(new TextEncoder().encode(raw), { level: 9 });
  return CODE_PREFIX + bytesToBase64Url(compressed);
}

/**
 * Decode a paste: share code, raw payload, or full Kizuna URL.
 * Whitespace / newlines inside codes are ignored.
 */
export function decodeShareInput(input: string): Team | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Full URL or hash fragment pasted by accident.
  const hashMatch = trimmed.match(/#(c|t)=([^\s#]+)/i);
  if (hashMatch) {
    return hashMatch[1]!.toLowerCase() === "c"
      ? decodeShareCode(hashMatch[2]!)
      : decodeTeam(hashMatch[2]!);
  }

  // Strip whitespace so multi-line Discord pastes still work.
  const compact = trimmed.replace(/\s+/g, "");

  if (compact.startsWith(CODE_PREFIX) || compact.toUpperCase().startsWith("KZ1.")) {
    return decodeShareCode(compact);
  }

  // Bare raw payload (starts with version digit + ~).
  if (/^\d~/.test(compact)) return decodeTeam(compact);

  return null;
}

function decodeShareCode(code: string): Team | null {
  const body = code.startsWith(CODE_PREFIX)
    ? code.slice(CODE_PREFIX.length)
    : code.replace(/^KZ1\./i, "");
  if (!body) return null;

  const bytes = base64UrlToBytes(body);
  if (!bytes) return null;

  try {
    const raw = new TextDecoder().decode(inflateSync(bytes));
    return decodeTeam(raw);
  } catch {
    return null;
  }
}

export function teamShareUrl(team: Team): string {
  const { origin, pathname } = window.location;
  // Compressed code in the hash — short enough to survive most chat clients.
  return `${origin}${pathname}${HASH_CODE}${encodeShareCode(team)}`;
}

export function teamFromLocationHash(hash: string = window.location.hash): Team | null {
  if (hash.startsWith(HASH_CODE)) return decodeShareCode(hash.slice(HASH_CODE.length));
  if (hash.startsWith(HASH_RAW)) return decodeTeam(hash.slice(HASH_RAW.length));
  return null;
}

export function writeTeamToLocationHash(team: Team): void {
  const next = `${HASH_CODE}${encodeShareCode(team)}`;
  if (window.location.hash !== next) {
    window.history.replaceState(null, "", next);
  }
}
