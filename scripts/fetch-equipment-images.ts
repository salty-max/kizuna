/**
 * Scrapes item icons from Inazugle into `data/raw/equipment-images.json`.
 *
 * Equipment stats come from the dataminer; icons come from Inazugle. The
 * official codex renders each item with an icon and puts the item's name in
 * the `alt` attribute — so name is the only join key available. Roughly 86% of
 * our catalogue matches; the rest are naming differences between the two
 * sources and simply end up without an icon.
 *
 * Run by hand, like `fetch-raw.ts`, then re-run `bun run data`. Pages are
 * fetched one at a time with a pause between them: this is someone else's
 * server and the whole job is a few dozen requests.
 */

const BASE = "https://zukan.inazuma.jp/en/item/equip/";
const PER_PAGE = 200;
const DELAY_MS = 700;

/** Inazugle's `category_filter` values, mapped onto our own slot names. */
const CATEGORIES = {
  boots: 30,
  bracelet: 40,
  pendant: 50,
  misc: 60,
} as const;

interface ScrapedItem {
  name: string;
  image: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchPage(category: number, page: number): Promise<string> {
  const url = `${BASE}?per_page=${PER_PAGE}&category_filter=${category}&page=${page}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "kizuna-team-builder (personal fan project)" },
  });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}

/**
 * Item icons are the only `/1/k/` images inside `itemListBox`; site chrome and
 * OGP tags live outside it, so slicing to the list avoids matching them.
 */
function extractItems(html: string): ScrapedItem[] {
  const start = html.indexOf("itemListBox");
  if (start === -1) return [];

  const list = html.slice(start);
  const pattern =
    /<img\s+src="(https:\/\/dxi4wb638ujep\.cloudfront\.net\/1\/k\/[^"]+)"\s*\n?\s*alt="([^"]*)"/g;

  const items: ScrapedItem[] = [];
  for (const match of list.matchAll(pattern)) {
    const name = match[2]!.trim();
    if (name) items.push({ name, image: match[1]! });
  }
  return items;
}

const output: Record<string, ScrapedItem[]> = {};

for (const [slot, category] of Object.entries(CATEGORIES)) {
  const seen = new Map<string, string>();

  for (let page = 1; page <= 10; page++) {
    const items = extractItems(await fetchPage(category, page));
    const before = seen.size;
    for (const item of items) if (!seen.has(item.name)) seen.set(item.name, item.image);

    // A page that adds nothing new means we have run past the end — the site
    // clamps out-of-range pages to the last one rather than erroring.
    if (items.length === 0 || seen.size === before) break;

    await sleep(DELAY_MS);
  }

  output[slot] = [...seen].map(([name, image]) => ({ name, image }));
  console.log(`${slot.padEnd(9)} ${String(output[slot]!.length).padStart(4)} icônes`);
}

await Bun.write(
  new URL("../data/raw/equipment-images.json", import.meta.url),
  JSON.stringify(output, null, 1),
);

const total = Object.values(output).reduce((sum, items) => sum + items.length, 0);
console.log(`\n${total} icônes écrites dans data/raw/equipment-images.json`);
