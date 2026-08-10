/**
 * Turns `data/raw/` into the artifacts the app actually fetches, in `public/data/`.
 *
 * Three jobs:
 *  1. Drop the ~560 placeholder rows the upstream dump carries (`Name: "???"`,
 *     `Position: "?"`), which would otherwise pollute every filter and count.
 *  2. Split players into a light index (fetched at boot) and per-bucket detail
 *     files (fetched when a sheet opens). The long-form "how to obtain" text is
 *     the overwhelming majority of the 4.5 MB raw file and nothing lists it.
 *  3. Validate every enum-ish value against the domain unions in src/domain and
 *     ABORT on anything unknown. An upstream refresh that adds a new element or
 *     passive scope must fail here, loudly — never silently drop effects and
 *     leave the synergy engine quietly wrong.
 */

import {
  ELEMENTS,
  PASSIVE_CONDITIONS,
  PASSIVE_SCOPES,
  PASSIVE_STATS,
  POSITIONS,
  ROLES,
  type Ability,
  type BuildType,
  type Element,
  type Equipment,
  type EquipmentSlot,
  type PassiveCondition,
  type PassiveEffect,
  type PassiveScope,
  type PassiveSource,
  type PassiveStat,
  type Passive,
  type Player,
  type PlayerDetails,
  type Position,
  type Role,
} from "../src/domain/types";
import { STAT_KEYS, type BaseStats } from "../src/domain/stats";

const RAW = new URL("../data/raw/", import.meta.url);
const OUT = new URL("../public/data/", import.meta.url);

/** ids per detail file — ~22 buckets of ~200 KB each. */
const DETAIL_BUCKET_SIZE = 250;

const problems: string[] = [];

function readRaw<T>(file: string): Promise<T> {
  return Bun.file(new URL(file, RAW)).json() as Promise<T>;
}

/** Records the value as a problem and returns null, rather than throwing at the
 *  first bad row — one run should report every issue at once. */
function oneOf<T extends string>(
  allowed: readonly T[],
  value: unknown,
  where: string,
): T | null {
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  problems.push(`${where}: unknown value ${JSON.stringify(value)}`);
  return null;
}

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/* ── Players ──────────────────────────────────────────────────────────────── */

interface RawPlayer {
  id: number;
  Image: string;
  InazugleLink: string;
  Description: string;
  HowToObtainMarkdown: string;
  Name: string;
  Nickname: string;
  Game: string;
  Position: string;
  Element: string;
  Kick: number;
  Control: number;
  Technique: number;
  Pressure: number;
  Physical: number;
  Agility: number;
  Intelligence: number;
  Total: number;
  "Age group": string;
  Year: string;
  Gender: string;
  Role: string;
  Affinity?: string;
}

/** Affinity on a character; buildType on a passive. Same six archetypes, two spellings. */
const BUILD_TYPE_ALIASES: Record<string, BuildType> = {
  Justice: "justice",
  Tension: "tension",
  Counter: "counter",
  Bond: "bond",
  Brecha: "breach",
  Breach: "breach",
  RoughPlay: "roughPlay",
  "Rough Play": "roughPlay",
};

function toBuildType(value: unknown, where: string): BuildType | null {
  if (value == null || value === "" || value === "Unknown" || value === "?") return null;
  const mapped = BUILD_TYPE_ALIASES[String(value)];
  if (!mapped) {
    problems.push(`${where}: unknown build type ${JSON.stringify(value)}`);
    return null;
  }
  return mapped;
}

/** Placeholder rows the dump uses for unrevealed characters. */
function isPlaceholder(raw: RawPlayer): boolean {
  return (
    raw.Name === "???" ||
    raw.Name === "?" ||
    raw.Position === "?" ||
    raw.Role === "?" ||
    raw.Element === "?"
  );
}

async function buildPlayers() {
  const raw = await readRaw<RawPlayer[]>("players.json");
  const kept = raw.filter((r) => !isPlaceholder(r));

  // Strip the shared CDN origin from every image path; the app re-attaches it.
  const prefixes = new Set(kept.map((r) => new URL(r.Image).origin + "/"));
  const imageBase = prefixes.size === 1 ? [...prefixes][0]! : "";
  if (prefixes.size !== 1) {
    problems.push(`images span ${prefixes.size} origins — keeping absolute URLs`);
  }

  const players: Player[] = [];
  const details: PlayerDetails[] = [];

  for (const r of kept) {
    const where = `player ${r.id} (${r.Name})`;
    const position = oneOf<Position>(POSITIONS, r.Position, `${where}.Position`);
    const element = oneOf<Element>(ELEMENTS, r.Element, `${where}.Element`);
    // Two rows (Seymour Hillman, Astero Black) have a blank Role but complete
    // stats, a position and an element — a gap in the source, not a non-player.
    const role = r.Role === "" ? "Player" : oneOf<Role>(ROLES, r.Role, `${where}.Role`);
    if (!position || !element || !role) continue;

    const stats: BaseStats = {
      kick: num(r.Kick),
      control: num(r.Control),
      technique: num(r.Technique),
      pressure: num(r.Pressure),
      physical: num(r.Physical),
      agility: num(r.Agility),
      intelligence: num(r.Intelligence),
    };

    const declaredTotal = num(r.Total);
    const summed = STAT_KEYS.reduce((sum, k) => sum + stats[k], 0);
    if (declaredTotal !== summed) {
      problems.push(`${where}: Total ${declaredTotal} ≠ sum of stats ${summed}`);
    }

    players.push({
      id: r.id,
      name: r.Name,
      nickname: r.Nickname,
      image: imageBase ? r.Image.slice(imageBase.length) : r.Image,
      game: r.Game,
      position,
      element,
      buildType: toBuildType(r.Affinity, `${where}.Affinity`),
      role,
      gender: r.Gender || "Unknown",
      ageGroup: r["Age group"] || "Unknown",
      year: r.Year || "-",
      stats,
      total: summed,
    });

    details.push({
      id: r.id,
      description: r.Description ?? "",
      howToObtain: r.HowToObtainMarkdown ?? "",
      inazugleLink: r.InazugleLink ?? "",
    });
  }

  players.sort((a, b) => a.id - b.id);

  const buckets = new Map<number, PlayerDetails[]>();
  for (const d of details) {
    const key = Math.floor(d.id / DETAIL_BUCKET_SIZE);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(d);
    else buckets.set(key, [d]);
  }
  for (const [key, rows] of buckets) {
    await write(`players/${key}.json`, rows);
  }

  const games = [...new Set(players.map((p) => p.game))].sort();

  return { players, games, imageBase, dropped: raw.length - kept.length, buckets: buckets.size };
}

/* ── Passives ─────────────────────────────────────────────────────────────── */

interface RawPassive {
  id: string;
  number: number;
  type: string;
  buildType: string | null;
  description: string;
  strongValue: number;
  weakValue: number;
  effects: {
    scope: string;
    stat: string;
    mode: string;
    direction: string;
    conditions: { type: string }[];
  }[];
}

async function buildPassives() {
  const sources: PassiveSource[] = ["player", "custom", "manager", "coordinator"];
  const passives: Passive[] = [];

  for (const source of sources) {
    const raw = await readRaw<RawPassive[]>(`passives/${source}.json`);
    for (const r of raw) {
      const where = `passive ${r.id}`;
      const effects: PassiveEffect[] = [];

      for (const [i, e] of r.effects.entries()) {
        const scope = oneOf<PassiveScope>(PASSIVE_SCOPES, e.scope, `${where}.effects[${i}].scope`);
        const stat = oneOf<PassiveStat>(PASSIVE_STATS, e.stat, `${where}.effects[${i}].stat`);
        if (e.mode !== "percent") {
          problems.push(`${where}.effects[${i}]: unhandled mode ${JSON.stringify(e.mode)}`);
        }
        if (e.direction !== "increase" && e.direction !== "decrease") {
          problems.push(`${where}.effects[${i}]: bad direction ${JSON.stringify(e.direction)}`);
        }
        const conditions = (e.conditions ?? [])
          .map((c, j) =>
            oneOf<PassiveCondition>(
              PASSIVE_CONDITIONS,
              c.type,
              `${where}.effects[${i}].conditions[${j}]`,
            ),
          )
          .filter((c): c is PassiveCondition => c !== null);

        if (!scope || !stat) continue;
        effects.push({
          scope,
          stat,
          mode: "percent",
          direction: e.direction === "decrease" ? "decrease" : "increase",
          conditions,
        });
      }

      passives.push({
        id: r.id,
        number: r.number,
        source,
        buildType: toBuildType(r.buildType, `${where}.buildType`),
        description: r.description,
        strongValue: num(r.strongValue),
        weakValue: num(r.weakValue),
        effects,
      });
    }
  }

  return passives;
}

/* ── Equipment & abilities ────────────────────────────────────────────────── */

interface RawEquipment {
  id: string;
  Name: string;
  Shop: string;
  Kick: number | "";
  Control: number | "";
  Technique: number | "";
  Pressure: number | "";
  Physical: number | "";
  Intelligence: number | "";
  Agility: number | "";
}

/**
 * Icons scraped from Inazugle by `fetch-equipment-images.ts`. Name is the only
 * join key the two sources share, and it is compared loosely because they
 * differ on punctuation and spacing ("Queen's Knights" vs "Queens Knights").
 */
async function loadEquipmentImages(): Promise<Map<string, string>> {
  const file = Bun.file(new URL("equipment-images.json", RAW));
  if (!(await file.exists())) {
    problems.push("data/raw/equipment-images.json absent — lance `bun run data:images`");
    return new Map();
  }

  const raw = (await file.json()) as Record<string, { name: string; image: string }[]>;
  const index = new Map<string, string>();
  for (const [slot, items] of Object.entries(raw)) {
    for (const item of items) index.set(`${slot}:${loosely(item.name)}`, item.image);
  }
  return index;
}

function loosely(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function buildEquipment() {
  const files: Record<EquipmentSlot, string> = {
    boots: "equipments/boots.json",
    pendant: "equipments/pendants.json",
    bracelet: "equipments/bracelets.json",
    misc: "equipments/misc.json",
  };

  const images = await loadEquipmentImages();
  let matched = 0;

  const equipment: Equipment[] = [];
  for (const [slot, file] of Object.entries(files) as [EquipmentSlot, string][]) {
    for (const r of await readRaw<RawEquipment[]>(file)) {
      // Blank cells mean "no bonus"; keep only the stats a piece actually grants.
      const stats: Partial<BaseStats> = {};
      const source: Record<string, number | ""> = {
        kick: r.Kick,
        control: r.Control,
        technique: r.Technique,
        pressure: r.Pressure,
        physical: r.Physical,
        agility: r.Agility,
        intelligence: r.Intelligence,
      };
      let total = 0;
      for (const key of STAT_KEYS) {
        const value = num(source[key] === "" ? 0 : source[key]);
        if (value !== 0) {
          stats[key] = value;
          total += value;
        }
      }
      const image = images.get(`${slot}:${loosely(r.Name)}`);
      if (image) matched++;

      equipment.push({
        id: `${slot}:${r.id}`,
        slot,
        name: r.Name,
        shop: r.Shop ?? "",
        stats,
        total,
        ...(image ? { image } : {}),
      });
    }
  }

  return { equipment, matched };
}

interface RawAbility {
  Name: string;
  Element: string;
  Power: string;
  Tension: string;
  Type: string;
  Extra: string;
  Shop: string;
}

async function buildAbilities() {
  const raw = await readRaw<RawAbility[]>("abilities.json");
  const seen = new Map<string, number>();

  return raw.map((r): Ability => {
    // Names repeat across elements/types, so ids get a disambiguating suffix.
    const base = slug(r.Name);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);

    return {
      id: n === 1 ? base : `${base}-${n}`,
      name: r.Name,
      type: r.Type || "Unknown",
      element: (ELEMENTS as readonly string[]).includes(r.Element)
        ? (r.Element as Element)
        : null,
      power: num(r.Power),
      tension: num(r.Tension),
      extra: r.Extra ?? "",
      shop: r.Shop ?? "",
    };
  });
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/* ── Run ──────────────────────────────────────────────────────────────────── */

async function write(name: string, data: unknown) {
  const json = JSON.stringify(data);
  await Bun.write(new URL(name, OUT), json);
  return json.length;
}

const { players, games, imageBase, dropped, buckets } = await buildPlayers();
const passives = await buildPassives();
const { equipment, matched: equipmentIcons } = await buildEquipment();
const abilities = await buildAbilities();

const sizes = {
  "players.json": await write("players.json", players),
  "passives.json": await write("passives.json", passives),
  "equipment.json": await write("equipment.json", equipment),
  "abilities.json": await write("abilities.json", abilities),
  "meta.json": await write("meta.json", {
    generatedAt: new Date().toISOString(),
    imageBase,
    games,
    detailBucketSize: DETAIL_BUCKET_SIZE,
    counts: {
      players: players.length,
      passives: passives.length,
      equipment: equipment.length,
      abilities: abilities.length,
    },
  }),
};

const kb = (n: number) => `${(n / 1024).toFixed(0)} KB`;
console.log(`players     ${String(players.length).padStart(5)}  ${kb(sizes["players.json"])}   (${dropped} placeholders dropped)`);
console.log(`passives    ${String(passives.length).padStart(5)}  ${kb(sizes["passives.json"])}`);
console.log(
  `equipment   ${String(equipment.length).padStart(5)}  ${kb(sizes["equipment.json"])}   ` +
    `(${equipmentIcons} icônes, ${equipment.length - equipmentIcons} sans)`,
);
console.log(`abilities   ${String(abilities.length).padStart(5)}  ${kb(sizes["abilities.json"])}`);
console.log(`details            ${buckets} bucket files (lazy)`);
console.log(`games       ${games.length}`);

if (problems.length > 0) {
  const shown = problems.slice(0, 40);
  console.error(`\n${problems.length} data problem(s):`);
  for (const p of shown) console.error(`  • ${p}`);
  if (problems.length > shown.length) console.error(`  … ${problems.length - shown.length} more`);
  process.exit(1);
}

console.log("\nOK");
