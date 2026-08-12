/**
 * Scrapes character portraits + gender from Inazugle into
 * `data/raw/player-images.json`.
 *
 * The only portrait / gender source for the build — the dataminer dump has
 * neither. Inazugle's `/en/chara_list/` ships every row with the English name
 * in `data-chara-name` and a Gender cell (Male / Female / Unknown / Neutral).
 *
 * Run by hand, then `bun run data`. Paced at one page per ~700 ms — ~28 pages.
 */

const BASE = "https://zukan.inazuma.jp/en/chara_list/";
const PER_PAGE = 200;
const DELAY_MS = 700;
const OUT = new URL("../data/raw/player-images.json", import.meta.url);

type ScrapedGender = "Male" | "Female" | "Unknown" | "Neutral";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface ScrapedPortrait {
  name: string;
  image: string;
  /** Inazugle path id (`k/d/w/dwho-wi8ruk`) — useful if we ever rehost. */
  charaId: string;
  /** From the Gender column; empty when the cell was missing. */
  gender: ScrapedGender | "";
}

async function fetchPage(page: number): Promise<string> {
  const url = `${BASE}?per_page=${PER_PAGE}&page=${page}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "kizuna-team-builder (personal fan project)" },
  });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}

/** Inazugle puts `Eddy O&#39;Ryan` in attributes — undo the handful of entities. */
function decodeEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&apos;/g, "'");
}

function parseGender(window: string): ScrapedGender | "" {
  const match = window.match(/<td rowspan="2">(Male|Female|Unknown|Neutral)<\/td>/);
  if (!match) return "";
  return match[1] as ScrapedGender;
}

/**
 * Each row carries `data-chara-id` + `data-chara-name` on the checkbox.
 * Gender sits later in the same `<tr>` as `<td rowspan="2">Male|Female|…</td>`.
 * Rebuild the CDN URL from the chara id.
 */
function extract(html: string): ScrapedPortrait[] {
  const out: ScrapedPortrait[] = [];
  const re = /data-chara-id="([^"]+)"\s+data-chara-name="([^"]+)"/g;
  for (const match of html.matchAll(re)) {
    const charaId = match[1]!.trim();
    const name = decodeEntities(match[2]!).trim();
    if (!charaId || !name) continue;
    // ids look like `k/d/w/dwho-wi8ruk` → CDN path `/1/k/d/w/dwho-wi8ruk.png`
    const image = `https://dxi4wb638ujep.cloudfront.net/1/${charaId}.png`;
    const gender = parseGender(html.slice(match.index ?? 0, (match.index ?? 0) + 5000));
    out.push({ name, image, charaId, gender });
  }
  return out;
}

const byName = new Map<string, ScrapedPortrait>();

for (let page = 1; page <= 40; page++) {
  const html = await fetchPage(page);
  const rows = extract(html);
  if (rows.length === 0) {
    console.log(`page ${page}: empty — done`);
    break;
  }

  let added = 0;
  for (const row of rows) {
    // First win keeps the earliest list order; later series variants of the
    // same English name often share art or are near-identical.
    if (!byName.has(row.name)) {
      byName.set(row.name, row);
      added++;
    }
  }
  const withGender = rows.filter((r) => r.gender).length;
  console.log(
    `page ${String(page).padStart(2)}: ${rows.length} rows, +${added} new (total ${byName.size}, gender ${withGender}/${rows.length})`,
  );

  // Page 1 sometimes returns 199 for no clear reason — only stop on a truly
  // empty page, not on "fewer than PER_PAGE".
  await sleep(DELAY_MS);
}

const list = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
await Bun.write(OUT, JSON.stringify(list, null, 2));
const gendered = list.filter((r) => r.gender).length;
console.log(`\n${list.length} portraits (${gendered} with gender) → data/raw/player-images.json`);
