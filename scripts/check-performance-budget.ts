import { gzipSync } from "node:zlib";

const ROOT = new URL("../", import.meta.url);
const DIST = new URL("dist/", ROOT);
const DATA = new URL("public/data/", ROOT);

const BUILDER_DATA_FILES = [
  "meta.json",
  "players.json",
  "passives.json",
  "equipment.json",
  "abilities.json",
  "tactics.json",
  "synergies.json",
] as const;

const BUDGETS = {
  // Baseline: content 6.00.23.00 after localized nicknames and the tactical
  // generator. Keep roughly 3–5% headroom so ordinary gzip variance passes,
  // while a new catalogue field or eager dependency still fails CI.
  playerShardRaw: 2_650_000,
  playerShardGzip: 525_000,
  builderDataRaw: 4_850_000,
  builderDataGzip: 880_000,
  initialAppGzip: 250_000,
  initialTotalGzip: 1_140_000,
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
