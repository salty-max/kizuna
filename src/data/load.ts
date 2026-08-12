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

interface Meta {
  generatedAt: string;
  imageBase: string;
  games: string[];
  detailBucketSize: number;
  counts: Record<string, number>;
}

const BASE = `${import.meta.env.BASE_URL}data`;

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/${path}`);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

/** Placeholder rows left in the dump (`必殺タクティクス名N`). */
function isRealTactic(tactic: Tactic): boolean {
  return !/必殺タクティクス名|test_/i.test(tactic.name);
}

let cached: Promise<Dataset> | null = null;

/** Fetched once at boot; the JSON shards are independent so they go in parallel. */
export function loadDataset(): Promise<Dataset> {
  cached ??= (async () => {
    const [meta, players, passives, equipment, abilities, tactics, synergies] = await Promise.all([
      getJson<Meta>("meta.json"),
      getJson<Player[]>("players.json"),
      getJson<Passive[]>("passives.json"),
      getJson<Equipment[]>("equipment.json"),
      getJson<Ability[]>("abilities.json"),
      getJson<Tactic[]>("tactics.json"),
      getJson<BondSynergy[]>("synergies.json"),
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
    };
  })();

  return cached;
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
