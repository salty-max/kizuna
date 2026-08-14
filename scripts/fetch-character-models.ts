/**
 * Resolve Inazugle turntable stems for every `character_id` in the dump.
 *
 * Output: `data/raw/character-models.json`
 *   { "c01000010": "1/k/q/l/qluc-tlklmm", ... }
 *
 * One HTML page per id (resumable, concurrent). Run by hand, then `bun run data`.
 */

import { encodeInazugleCharacterQuery, parseModelStemFromHtml } from "../src/lib/inazugleModel";

const OUT = new URL("../data/raw/character-models.json", import.meta.url);
const EN_BUNDLE = new URL("../data/raw/dataminer/ievr.en.json", import.meta.url);
const CONCURRENCY = 16;
const USER_AGENT = "kizuna-team-builder (fan project; character model index)";

interface BundleCharacter {
  character_id?: string;
}

async function loadCharacterIds(): Promise<string[]> {
  const bundle = (await Bun.file(EN_BUNDLE).json()) as {
    characters?: BundleCharacter[];
    heroes?: BundleCharacter[];
    basaras?: BundleCharacter[];
  };
  const ids = new Set<string>();
  for (const rows of [bundle.characters, bundle.heroes, bundle.basaras]) {
    for (const row of rows ?? []) {
      if (row.character_id) ids.add(row.character_id);
    }
  }
  return [...ids].sort();
}

async function loadExisting(): Promise<Record<string, string>> {
  try {
    const raw = (await Bun.file(OUT).json()) as Record<string, string>;
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

async function fetchStem(characterId: string): Promise<string | null> {
  const q = encodeInazugleCharacterQuery(characterId);
  const url = `https://zukan.inazuma.jp/en/chara_model_view/?q=${q}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) return null;
  return parseModelStemFromHtml(await res.text());
}

async function main() {
  const ids = await loadCharacterIds();
  const map = await loadExisting();
  const pending = ids.filter((id) => !map[id]);
  console.log(
    `character models: ${ids.length} ids, ${pending.length} to fetch, ${Object.keys(map).length} cached`,
  );

  let done = 0;
  let failed = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < pending.length) {
      const index = cursor++;
      const id = pending[index]!;
      try {
        const stem = await fetchStem(id);
        if (stem) map[id] = stem;
        else failed += 1;
      } catch {
        failed += 1;
      }
      done += 1;
      if (done % 100 === 0 || done === pending.length) {
        await Bun.write(OUT, `${JSON.stringify(map, null, 2)}\n`);
        console.log(`  ${done}/${pending.length} (ok ${Object.keys(map).length}, miss ${failed})`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  await Bun.write(OUT, `${JSON.stringify(map, null, 2)}\n`);
  console.log(`wrote ${OUT.pathname} — ${Object.keys(map).length} stems, ${failed} misses`);
}

await main();
