import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const ROOT = new URL("../", import.meta.url);
const DIST = new URL("dist/", ROOT);
const DATA = new URL("public/data/", ROOT);

/** Everything the builder fetches before it can draw a pitch. */
const BUILDER_DATA_FILES = [
  "meta.json",
  "players.json",
  "passives.json",
  "equipment.json",
  "abilities.json",
  "tactics.json",
  "synergies.json",
] as const;

/**
 * Catalogues no first paint waits on, so they carry no budget: a wiki route
 * asks for them and nothing else does. Listed rather than ignored so that
 * adding a data file forces the choice — budgeted, or justified here.
 * Must stay in step with `BUILDER_SHARDS` in `src/data/load.ts`.
 */
const DEFERRED_DATA_FILES = ["locations.json"] as const;

const BUDGETS = {
  // Baseline: content 6.00.23.00, measured after the Inazugle turntable
  // (`characterId` + `modelStem` on every player) and the `foundIn` drop
  // locations, with ~4% headroom — enough for ordinary gzip variance, tight
  // enough that a new catalogue field or an eager dependency still fails CI.
  //
  // These numbers were last raised on 2026-08-17. The previous baseline had
  // been exceeded since the turntable landed, which left CI red for six
  // straight commits: the budget was doing its job and nobody was reading it.
  // So: when a change legitimately needs more room, raise the line *and* say
  // which feature bought the bytes. Never raise it to silence a run you have
  // not explained.
  playerShardRaw: 2_830_000,
  playerShardGzip: 618_000,
  builderDataRaw: 5_055_000,
  builderDataGzip: 983_000,
  initialAppGzip: 250_000,
  initialTotalGzip: 1_233_000,
} as const;

interface ViteManifestEntry {
  file: string;
  css?: string[];
  imports?: string[];
  isEntry?: boolean;
}

interface Size {
  raw: number;
  gzip: number;
}

async function compressedSize(url: URL): Promise<Size> {
  const bytes = await Bun.file(url).bytes();
  return { raw: bytes.byteLength, gzip: gzipSync(bytes, { level: 9 }).byteLength };
}

function add(left: Size, right: Size): Size {
  return { raw: left.raw + right.raw, gzip: left.gzip + right.gzip };
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

async function initialAppAssets(): Promise<string[]> {
  const manifest = (await Bun.file(new URL(".vite/manifest.json", DIST)).json()) as Record<
    string,
    ViteManifestEntry
  >;
  const entryKey = Object.entries(manifest).find(([, entry]) => entry.isEntry)?.[0];
  if (!entryKey) throw new Error("dist/.vite/manifest.json: entry asset not found");

  const assets = new Set<string>();
  const visited = new Set<string>();
  const visit = (key: string) => {
    if (visited.has(key)) return;
    visited.add(key);
    const entry = manifest[key];
    if (!entry) throw new Error(`dist/.vite/manifest.json: missing import ${key}`);
    assets.add(entry.file);
    for (const css of entry.css ?? []) assets.add(css);
    for (const imported of entry.imports ?? []) visit(imported);
  };
  visit(entryKey);
  return [...assets].sort();
}

async function sumFiles(base: URL, files: readonly string[]): Promise<Size> {
  let total: Size = { raw: 0, gzip: 0 };
  for (const file of files) total = add(total, await compressedSize(new URL(file, base)));
  return total;
}

function report(label: string, actual: number, budget: number): boolean {
  const ok = actual <= budget;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label.padEnd(30)} ${formatBytes(actual).padStart(11)} / ${formatBytes(budget)}`,
  );
  return ok;
}

/**
 * A catalogue that is in neither list escapes every budget without anyone
 * choosing that, which is exactly how a first paint grows unnoticed.
 */
async function assertEveryCatalogueIsClassified(): Promise<void> {
  const present = (await readdir(fileURLToPath(DATA), { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name);
  const classified = new Set<string>([...BUILDER_DATA_FILES, ...DEFERRED_DATA_FILES]);

  const unclassified = present.filter((name) => !classified.has(name));
  if (unclassified.length > 0) {
    throw new Error(
      `public/data/: ${unclassified.join(", ")} is budgeted by neither BUILDER_DATA_FILES ` +
        `nor DEFERRED_DATA_FILES — add it to whichever describes when it is fetched`,
    );
  }

  const missing = [...classified].filter((name) => !present.includes(name));
  if (missing.length > 0) {
    throw new Error(`public/data/: ${missing.join(", ")} listed but not generated`);
  }
}

await assertEveryCatalogueIsClassified();

const playerShard = await compressedSize(new URL("players.json", DATA));
const builderData = await sumFiles(DATA, BUILDER_DATA_FILES);
const appAssets = await initialAppAssets();
const initialApp = await sumFiles(DIST, appAssets);
const initialTotal = add(builderData, initialApp);

console.log("Kizuna production performance budget\n");
const checks = [
  report("Player shard · raw", playerShard.raw, BUDGETS.playerShardRaw),
  report("Player shard · gzip", playerShard.gzip, BUDGETS.playerShardGzip),
  report("Builder data · raw", builderData.raw, BUDGETS.builderDataRaw),
  report("Builder data · gzip", builderData.gzip, BUDGETS.builderDataGzip),
  report("Initial app · gzip", initialApp.gzip, BUDGETS.initialAppGzip),
  report("Initial total · gzip", initialTotal.gzip, BUDGETS.initialTotalGzip),
];
console.log(`\nInitial assets: ${appAssets.join(", ")}`);

if (checks.some((ok) => !ok)) throw new Error("Production performance budget exceeded");
