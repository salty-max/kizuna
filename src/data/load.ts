import type {
  Ability,
  BondSynergy,
  Dataset,
  Equipment,
  Passive,
  Player,
  PlayerDetails,
  Tactic,
} from "@/domain/types";
import { decodePlayerShard } from "./player-shard";

interface Meta {
  generatedAt: string;
  imageBase: string;
  games: string[];
  detailBucketSize: number;
  counts: Record<string, number>;
}

export const DATA_SHARDS = [
  "players",
  "passives",
  "equipment",
  "abilities",
  "tactics",
  "synergies",
] as const;
export type DataShard = (typeof DATA_SHARDS)[number];

const WIKI_SHARDS: Record<string, readonly DataShard[]> = {
  abilities: ["abilities"],
  equipment: ["equipment"],
  tactics: ["tactics"],
  passives: ["passives"],
  bonds: ["players", "synergies"],
};

/** Smallest catalogue set that can render a route. The builder needs everything. */
export function datasetShardsForPath(pathname: string): readonly DataShard[] {
  if (pathname === "/" || !pathname.startsWith("/wiki")) return DATA_SHARDS;
  const [, , section, id] = pathname.split("/");
  if (!section) return [];
  if (section === "players") return id ? ["players", "abilities"] : ["players"];
  return WIKI_SHARDS[section] ?? [];
}

const BASE = `${import.meta.env.BASE_URL}data`;

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/${path}`);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

/** Placeholder rows left in the dump (`必殺タクティクス名N`). */
function isRealTactic(tactic: Tactic): boolean {
  const blob = [tactic.name, tactic.names?.fr, tactic.names?.en, tactic.names?.ja]
    .filter(Boolean)
    .join(" ");
  return !/必殺タクティクス名|test_/i.test(blob) && !tactic.id.startsWith("test_");
}

interface ShardContents {
  players: Player[];
  passives: Passive[];
  equipment: Equipment[];
  abilities: Ability[];
  tactics: Tactic[];
  synergies: BondSynergy[];
}

const SHARD_FILES: { [K in DataShard]: string } = {
  players: "players.json",
  passives: "passives.json",
  equipment: "equipment.json",
  abilities: "abilities.json",
  tactics: "tactics.json",
  synergies: "synergies.json",
};

let metaCache: Promise<Meta> | null = null;
const shardCache = new Map<DataShard, Promise<unknown>>();

function loadMeta(): Promise<Meta> {
  if (!metaCache) {
    const pending = getJson<Meta>("meta.json");
    metaCache = pending;
    pending.catch(() => {
      if (metaCache === pending) metaCache = null;
    });
  }
  return metaCache;
}

function loadShard<K extends DataShard>(shard: K): Promise<ShardContents[K]> {
  let pending = shardCache.get(shard);
  if (!pending) {
    pending = getJson<unknown>(SHARD_FILES[shard]).then((contents) =>
      shard === "players" ? decodePlayerShard(contents) : contents,
    );
    shardCache.set(shard, pending);
    pending.catch(() => {
      if (shardCache.get(shard) === pending) shardCache.delete(shard);
    });
  }
  return pending as Promise<ShardContents[K]>;
}

/** Fetch only the catalogue shards required by the current route; cache each once. */
export async function loadDataset(shards: readonly DataShard[] = DATA_SHARDS): Promise<Dataset> {
  const requested = new Set(shards);
  const empty = <T>() => Promise.resolve([] as T[]);
  const [meta, players, passives, equipment, abilities, tactics, synergies] = await Promise.all([
    loadMeta(),
    requested.has("players") ? loadShard("players") : empty<Player>(),
    requested.has("passives") ? loadShard("passives") : empty<Passive>(),
    requested.has("equipment") ? loadShard("equipment") : empty<Equipment>(),
    requested.has("abilities") ? loadShard("abilities") : empty<Ability>(),
    requested.has("tactics") ? loadShard("tactics") : empty<Tactic>(),
    requested.has("synergies") ? loadShard("synergies") : empty<BondSynergy>(),
  ]);

  detailBucketSize = meta.detailBucketSize;

  return {
    players,
    passives,
    equipment,
    abilities,
    tactics: tactics.filter(isRealTactic),
    synergies,
    games: meta.games,
    imageBase: meta.imageBase,
    generatedAt: meta.generatedAt,
    counts: meta.counts,
  };
}

let detailBucketSize = 250;
const detailCache = new Map<number, Promise<PlayerDetails[]>>();

/** Long-form text lives in per-bucket files so opening one sheet fetches ~200 KB, not 4 MB. */
export async function loadPlayerDetails(playerId: number): Promise<PlayerDetails | null> {
  const bucket = Math.floor(playerId / detailBucketSize);
  let rows = detailCache.get(bucket);
  if (!rows) {
    rows = getJson<PlayerDetails[]>(`players/${bucket}.json`);
    detailCache.set(bucket, rows);
  }
  return (await rows).find((d) => d.id === playerId) ?? null;
}

/**
 * Portraits are hotlinked from the community CDN through a resizing proxy —
 * a 37 KB PNG comes back as a ~4 KB WebP, which matters across 5000+ thumbnails.
 * Empty `image` (no community join) returns "" so the avatar can fall back.
 */
export function imageUrl(imageBase: string, image: string, width?: number): string {
  if (!image) return "";
  const absolute = image.startsWith("http") ? image : `${imageBase}${image}`;
  if (!width) return absolute;
  const params = new URLSearchParams({
    url: absolute,
    w: String(width),
    output: "webp",
  });
  return `https://images.weserv.nl/?${params}`;
}
