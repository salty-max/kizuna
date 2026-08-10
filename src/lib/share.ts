import { findFormation } from "@/domain/formations";
import {
  MAX_SLOT_PASSIVES,
  allSlotIds,
  emptyAssignment,
  type SlotAssignment,
  type Team,
} from "@/domain/team";
import { BUILD_TYPES, EQUIPMENT_SLOTS, RARITIES, type EquipmentSlot } from "@/domain/types";

/**
 * Compact, hand-rolled encoding of a team for the URL hash.
 *
 * Deliberately not JSON+base64: a full squad with equipment and passives runs
 * to a few kilobytes of JSON, which is past what browsers and chat clients
 * handle comfortably in a URL. This gets a filled 4-4-2 down to roughly 400
 * characters, and stays readable enough to debug by eye.
 *
 *   2~<formation>~<name>~<slot>|<slot>|…
 *
 * Slots appear in `allSlotIds()` order, so their ids never need encoding.
 * Each slot is `playerId,rarity,b,p,c,m,pa0,…,pa5,buildType` — the rarity's
 * index (blank for Common, the default), equipment ids with their slot prefix
 * stripped, passives as `<shortId>*<value>`, and a 1-based archetype override
 * (blank inherits the dataset's). Empty means unset.
 *
 * The version prefix is load-bearing: bump it when the layout changes so old
 * links fail cleanly instead of decoding into a wrong squad. v1 predates
 * rarity and its slot fields are off by one, hence v2.
 */
const VERSION = "2";

const PASSIVE_PREFIXES: [full: string, short: string][] = [
  ["passive_", "p"],
  ["custom_", "c"],
  ["manager_", "m"],
  ["coordinator_", "o"],
];

function shortenPassiveId(id: string): string {
  for (const [full, short] of PASSIVE_PREFIXES) {
    if (id.startsWith(full)) return short + id.slice(full.length);
  }
  return id;
}

function expandPassiveId(id: string): string {
  for (const [full, short] of PASSIVE_PREFIXES) {
    if (id.startsWith(short) && /^\d+$/.test(id.slice(short.length))) {
      return full + id.slice(short.length);
    }
  }
  return id;
}

function encodeSlot(assignment: SlotAssignment): string {
  const rarityIndex = RARITIES.indexOf(assignment.rarity ?? "common");

  const fields: string[] = [
    assignment.playerId != null ? String(assignment.playerId) : "",
    // Normal is the default, so leave it blank and save a character per slot.
    rarityIndex > 0 ? String(rarityIndex) : "",
  ];

  for (const slot of EQUIPMENT_SLOTS) {
    const id = assignment.equipment[slot];
    // Ids are `${slot}:${rawId}`; the slot is already implied by position here.
    fields.push(id ? id.slice(slot.length + 1) : "");
  }

  for (let i = 0; i < MAX_SLOT_PASSIVES; i++) {
    const passive = assignment.passives[i];
    fields.push(
      passive?.passiveId ? `${shortenPassiveId(passive.passiveId)}*${passive.value}` : "",
    );
  }

  // Appended last, on purpose: a field added at the end is backwards
  // compatible, so this needed no version bump. Stored 1-based so that blank —
  // the common "inherit from the dataset" case — is unambiguous.
  const buildTypeIndex = assignment.buildType ? BUILD_TYPES.indexOf(assignment.buildType) + 1 : 0;
  fields.push(buildTypeIndex > 0 ? String(buildTypeIndex) : "");

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
    if (raw) assignment.equipment[slot] = `${slot}:${raw}`;
  });

  for (let i = 0; i < MAX_SLOT_PASSIVES; i++) {
    const raw = fields[2 + EQUIPMENT_SLOTS.length + i];
    if (!raw) continue;
    const separator = raw.lastIndexOf("*");
    if (separator === -1) continue;
    const value = Number(raw.slice(separator + 1));
    assignment.passives[i] = {
      passiveId: expandPassiveId(raw.slice(0, separator)),
      value: Number.isFinite(value) ? value : 0,
    };
  }

  const buildType = BUILD_TYPES[Number(fields[2 + EQUIPMENT_SLOTS.length + MAX_SLOT_PASSIVES]) - 1];
  if (buildType) assignment.buildType = buildType;

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

  return [VERSION, formation.id, name, slots].join("~");
}

export function decodeTeam(encoded: string): Team | null {
  const parts = encoded.split("~");
  if (parts.length < 4 || parts[0] !== VERSION) return null;

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

  const encodedSlots = parts.slice(3).join("~").split("|");
  const ids = allSlotIds(formation);
  const slots: Record<string, SlotAssignment> = {};

  ids.forEach((id, index) => {
    slots[id] = decodeSlot(encodedSlots[index] ?? "");
  });

  return { name: name || "Équipe partagée", formationId: formation.id, slots };
}

const HASH_PREFIX = "#t=";

export function teamShareUrl(team: Team): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}${HASH_PREFIX}${encodeTeam(team)}`;
}

export function teamFromLocationHash(hash: string = window.location.hash): Team | null {
  if (!hash.startsWith(HASH_PREFIX)) return null;
  return decodeTeam(hash.slice(HASH_PREFIX.length));
}

export function writeTeamToLocationHash(team: Team): void {
  const next = `${HASH_PREFIX}${encodeTeam(team)}`;
  if (window.location.hash !== next) {
    window.history.replaceState(null, "", next);
  }
}
