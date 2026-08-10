/**
 * Refreshes `data/raw/` from the upstream community dataset.
 *
 * The raw files are vendored in the repo on purpose: the app must not depend on
 * raw.githubusercontent at runtime, and pinning them means an upstream change
 * can never silently alter what the builder computes. Run this by hand when you
 * want to pull upstream fixes, then re-run `bun run data` and check the diff.
 */

const BASE =
  "https://raw.githubusercontent.com/lluni/inazuma-eleven-vr-wiki/master/src/assets/data";

const FILES = [
  "players.json",
  "abilities.json",
  "match-passives.json",
  "passives/player.json",
  "passives/custom.json",
  "passives/manager.json",
  "passives/coordinator.json",
  "equipments/boots.json",
  "equipments/pendants.json",
  "equipments/bracelets.json",
  "equipments/misc.json",
] as const;

const outDir = new URL("../data/raw/", import.meta.url);

for (const file of FILES) {
  const res = await fetch(`${BASE}/${file}`);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  const body = await res.text();

  // Fail loudly rather than writing an HTML error page over good data.
  JSON.parse(body);

  const target = new URL(file, outDir);
  await Bun.write(target, body);
  console.log(`${file.padEnd(28)} ${(body.length / 1024).toFixed(0)} KB`);
}

console.log(`\n${FILES.length} files written to data/raw/`);
