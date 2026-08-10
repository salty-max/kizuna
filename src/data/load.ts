import type {
  Ability,
  Dataset,
  Equipment,
  Passive,
  Player,
  PlayerDetails,
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

let cached: Promise<Dataset> | null = null;

/** Fetched once at boot; the four files are independent so they go in parallel. */
export function loadDataset(): Promise<Dataset> {
  cached ??= (async () => {
    const [meta, players, passives, equipment, abilities] = await Promise.all([
      getJson<Meta>("meta.json"),
      getJson<Player[]>("players.json"),
      getJson<Passive[]>("passives.json"),
      getJson<Equipment[]>("equipment.json"),
      getJson<Ability[]>("abilities.json"),
    ]);

    detailBucketSize = meta.detailBucketSize;

    return {
      players,
      passives,
      equipment,
      abilities,
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
 * Portraits are hotlinked from the dataset's CDN through a resizing proxy —
 * a 37 KB PNG comes back as a ~4 KB WebP, which matters at 4840 thumbnails.
 */
export function imageUrl(imageBase: string, image: string, width?: number): string {
  const absolute = image.startsWith("http") ? image : `${imageBase}${image}`;
  if (!width) return absolute;
  const params = new URLSearchParams({
    url: absolute,
    w: String(width),
    output: "webp",
  });
  return `https://images.weserv.nl/?${params}`;
}
