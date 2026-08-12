/**
 * Turns `data/raw/` into the artifacts the app actually fetches, in `public/data/`.
 *
 * Source of truth: the datamined bundles in `data/raw/dataminer/` (the game's own
 * files) plus Inazugle scrapes for portraits (`player-images.json`) and equipment
 * icons (`equipment-images.json`). No community dump.
 *
 * Still aborts on any enum-ish value it does not recognise. An upstream refresh
 * that adds a new element or passive scope must fail here, loudly.
 */

import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  AURA_TYPES,
  type Ability,
  type AbilityKind,
  type AuraType,
  type LearnedSkill,
  type BuildType,
  type Element,
  type Equipment,
  type EquipmentSlot,
  type Passive,
  type PassiveSource,
  type Player,
  type PlayerDetails,
  type Position,
} from "../src/domain/types";
import { STAT_KEYS, totalOf, type BaseStats } from "../src/domain/stats";

const RAW = new URL("../data/raw/", import.meta.url);
const OUT = new URL("../public/data/", import.meta.url);
const ICONS_OUT = new URL("../public/icons/", import.meta.url);

/** Display language for names/descriptions shipped to the app. */
const LANG: "fr" | "en" | "ja" = "fr";
/** English bundle — join key for Inazugle portraits (EN-keyed scrape). */
const JOIN_LANG = "en" as const;

/** CDN origin for Inazugle portraits; paths in the dataset are relative to this. */
const IMAGE_BASE = "https://dxi4wb638ujep.cloudfront.net/";

/** ids per detail file. Game ids run up to ~6000, so buckets stay small. */
const DETAIL_BUCKET_SIZE = 250;

const problems: string[] = [];

/* ── Verified game-code maps ──────────────────────────────────────────────── */

/**
 * Position codes, verified against known characters (Mark Evans → GK, Axel
 * Blaze → FW, Jude Sharp → MF, Jack Wallside → DF).
 */
const POSITION_BY_CODE: Record<number, Position> = {
  1: "GK",
  2: "FW",
  3: "MF",
  4: "DF",
};

/**
 * Style codes → build archetypes: 0 breach, 1 counter, 2 bond,
 * 3 tension, 4 roughPlay, 5 justice.
 */
const BUILD_TYPE_BY_CODE: Record<number, BuildType> = {
  0: "breach",
  1: "counter",
  2: "bond",
  3: "tension",
  4: "roughPlay",
  5: "justice",
};

/** From the bundle's own `legend.element`. */
const ELEMENT_BY_CODE: Record<number, Element | null> = {
  1: "Wind",
  2: "Forest",
  3: "Fire",
  4: "Mountain",
  5: null,
};

const HISSATSU_CATEGORY: Record<number, string> = {
  1: "Shoot",
  2: "Dribble",
  3: "Block",
  4: "Catch",
};

/** Game equipment slot → app slot. `special` is the accessory slot. */
const EQUIPMENT_SLOT_MAP: Record<string, EquipmentSlot> = {
  boots: "boots",
  pendant: "pendant",
  bracelet: "bracelet",
  special: "misc",
};

/* ── IO helpers ───────────────────────────────────────────────────────────── */

function readRawText(file: string): Promise<string> {
  return Bun.file(new URL(file, RAW)).text();
}

async function readRawJson<T>(file: string): Promise<T> {
  // Dataminer export is UTF-8 with BOM.
  const text = await readRawText(file);
  return JSON.parse(text.replace(/^\uFEFF/, "")) as T;
}

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function roundValue(value: number): number {
  // Game stores f32; 1.2000000476837158 → 1.2.
  return Math.round(value * 1e6) / 1e6;
}

/** Strip game UI markup: [CPASSIVE01], <VALUE>, <FLC:ENDO>, furigana, \\n. */
function cleanText(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/\[([^/\]]+)\/([^\]]+)\]/g, "$1") // furigana keep kanji
    .replace(/\[[^\]]*\]/g, "")
    .replace(/<VALUE>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function baseStatsFrom(raw: Partial<RawStats> | undefined): BaseStats {
  return {
    kick: num(raw?.kick),
    control: num(raw?.control),
    technique: num(raw?.technique),
    pressure: num(raw?.pressure),
    physical: num(raw?.physical),
    agility: num(raw?.agility),
    intelligence: num(raw?.intelligence),
  };
}

/* ── Dataminer bundle types ───────────────────────────────────────────────── */

interface RawStats {
  kick: number;
  control: number;
  technique: number;
  pressure: number;
  physical: number;
  agility: number;
  intelligence: number;
}

interface RawCharacter {
  id: number;
  name: string;
  name_original?: string;
  name_original_plain?: string;
  name_plain?: string;
  description?: string | null;
  description_plain?: string;
  series?: string;
  series_plain?: string;
  element: number;
  main_position: number;
  alt_position?: number;
  style: number;
  team?: string;
  team_id?: number;
  emblem?: string;
  emblem_era?: string;
  stats_lv50: RawStats;
  stats_lv99: RawStats;
  /** `[niveau, idTechnique]` — six slots du tronc commun. */
  skills?: [number, number][];
  /** `[niveau, idTechnique]` — la branche alternative, trois slots. */
  skills_alt?: [number, number][];
}

interface RawPassive {
  id: number;
  string_id: string;
  name: string | null;
  value: number | null;
  category: number;
  tiers: { family: number; tier: number }[];
  buff_icon?: number | null;
}

interface RawEquipment {
  id: number;
  string_id: string;
  name: string;
  description?: string | null;
  slot: string;
  stats: RawStats;
}

interface RawHissatsu {
  id: number;
  name: string;
  description?: string | null;
  power: number;
  element: number;
  category: number;
  growth_rate?: number;
  tp_consumption?: number;
  cooldown?: number;
  is_block?: boolean;
  is_longshot?: boolean;
}

/** Une aura n'a ni catégorie ni puissance — c'est un esprit, pas une technique. */
interface RawAura {
  id: number;
  name: string;
  description?: string | null;
  element: number;
  skill_id?: number;
  /** Mécanique, dérivée du préfixe de `string_id` par le dataminer. */
  type?: string;
  string_id?: string;
}

interface RawSynergy {
  id: number;
  string_id: string;
  name: string;
  description?: string | null;
  members: number[];
  member_names?: string[];
}

interface RawTactic {
  id: number;
  string_id: string;
  name: string;
  description?: string | null;
  tp_cost: number;
}

interface Bundle {
  lang: string;
  game_version: string;
  legend: {
    element: Record<string, string>;
    hissatsu_category?: Record<string, string>;
    note?: string;
  };
  characters: RawCharacter[];
  heroes: RawCharacter[];
  basaras: RawCharacter[];
  hissatsu: RawHissatsu[];
  aura_hissatsu: RawHissatsu[];
  auras: RawAura[];
  passives: RawPassive[];
  tactics: RawTactic[];
  synergies: RawSynergy[];
  equipment: RawEquipment[];
}

/** Collapse the name noise the dump / Inazugle occasionally leave behind. */
function normalizeName(name: string): string {
  return name.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Inazugle scrape (`bun run data:player-images`) — the only portrait source.
 */
async function loadInazuglePortraits(): Promise<Map<string, string>> {
  const file = Bun.file(new URL("player-images.json", RAW));
  if (!(await file.exists())) {
    problems.push("data/raw/player-images.json absent — lance `bun run data:player-images`");
    return new Map();
  }

  const raw = (await file.json()) as { name: string; image: string }[];
  const map = new Map<string, string>();
  for (const row of raw) {
    if (!row?.name || !row?.image) continue;
    const key = normalizeName(row.name);
    if (!map.has(key)) map.set(key, row.image);
  }
  return map;
}

/* ── Players ──────────────────────────────────────────────────────────────── */

function mapPosition(code: number, where: string): Position | null {
  const pos = POSITION_BY_CODE[code];
  if (!pos) {
    problems.push(`${where}: unknown position code ${code}`);
    return null;
  }
  return pos;
}

function mapElement(code: number, where: string): Element | null {
  if (!(code in ELEMENT_BY_CODE)) {
    problems.push(`${where}: unknown element code ${code}`);
    return null;
  }
  return ELEMENT_BY_CODE[code] ?? null;
}

function mapBuildType(code: number, where: string): BuildType | null {
  const bt = BUILD_TYPE_BY_CODE[code];
  if (bt === undefined) {
    problems.push(`${where}: unknown style code ${code}`);
    return null;
  }
  return bt;
}

function firstById(rows: RawCharacter[]): Map<number, RawCharacter> {
  const map = new Map<number, RawCharacter>();
  for (const row of rows) {
    if (!map.has(row.id)) map.set(row.id, row);
  }
  return map;
}

async function buildPlayers(display: Bundle, en: Bundle, knownAbilityIds: Set<string>) {
  const enNameById = new Map(
    en.characters.map((c) => [c.id, c.name.replace(/\s+/g, " ").trim()] as const),
  );
  for (const row of [...en.heroes, ...en.basaras]) {
    if (!enNameById.has(row.id)) {
      enNameById.set(row.id, row.name.replace(/\s+/g, " ").trim());
    }
  }

  const portraits = await loadInazuglePortraits();

  const baseById = firstById(display.characters);
  const heroById = firstById(display.heroes);
  const basaraById = firstById(display.basaras);

  const allIds = new Set<number>([...baseById.keys(), ...heroById.keys(), ...basaraById.keys()]);

  const players: Player[] = [];
  const details: PlayerDetails[] = [];
  let portraitsMatched = 0;

  for (const id of [...allIds].sort((a, b) => a - b)) {
    const base = baseById.get(id) ?? heroById.get(id) ?? basaraById.get(id);
    if (!base) continue;

    const where = `character ${id} (${base.name})`;
    const position = mapPosition(base.main_position, `${where}.main_position`);
    const element = mapElement(base.element, `${where}.element`);
    const buildType = mapBuildType(base.style, `${where}.style`);
    if (!position || !element) continue;

    const altPosition =
      base.alt_position != null && base.alt_position !== base.main_position
        ? mapPosition(base.alt_position, `${where}.alt_position`)
        : null;

    const statsLv50 = baseStatsFrom(base.stats_lv50);
    const statsLv99 = baseStatsFrom(base.stats_lv99);

    const hero = heroById.get(id);
    const basara = basaraById.get(id);

    const enName = (enNameById.get(id) ?? base.name).replace(/\s+/g, " ").trim();
    const scraped = portraits.get(normalizeName(enName));
    let image = "";
    if (scraped) {
      portraitsMatched++;
      image = scraped.startsWith(IMAGE_BASE) ? scraped.slice(IMAGE_BASE.length) : scraped;
    }

    const name = cleanText(base.name_plain ?? base.name)
      .replace(/\s+/g, " ")
      .trim();
    const nameOriginal = cleanText(base.name_original_plain ?? base.name_original ?? "")
      .replace(/\s+/g, " ")
      .trim();
    const series = cleanText(base.series_plain ?? base.series ?? "");

    players.push({
      id,
      name,
      nameOriginal,
      nickname: nameOriginal && nameOriginal !== name ? nameOriginal : "",
      image,
      game: series,
      team: cleanText(base.team ?? ""),
      position,
      altPosition,
      element,
      buildType,
      // Game dump has no staff role; everyone is a field character. Staff slots
      // pick from the full roster.
      role: "Player",
      gender: "Unknown",
      ageGroup: "Unknown",
      year: "-",
      stats: statsLv99,
      statsLv50,
      total: totalOf(statsLv99),
      skills: mapSkills(base.skills, knownAbilityIds, `${where}.skills`),
      skillsAlt: mapSkills(base.skills_alt, knownAbilityIds, `${where}.skills_alt`),
      // Les techniques dépendent de la forme, pas seulement des stats : sur les
      // 72 personnages présents dans `characters` et `heroes`, les 72 ont des
      // listes différentes. On les embarque donc séparément, comme les stats.
      heroSkills: hero ? skillSetOf(hero, knownAbilityIds, `${where}.hero`) : null,
      basaraSkills: basara ? skillSetOf(basara, knownAbilityIds, `${where}.basara`) : null,
      heroStats: hero
        ? { lv50: baseStatsFrom(hero.stats_lv50), lv99: baseStatsFrom(hero.stats_lv99) }
        : null,
      basaraStats: basara
        ? { lv50: baseStatsFrom(basara.stats_lv50), lv99: baseStatsFrom(basara.stats_lv99) }
        : null,
    });

    details.push({
      id,
      description: cleanText(base.description_plain ?? base.description),
      howToObtain: "",
      inazugleLink: "",
    });
  }

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

  const games = [...new Set(players.map((p) => p.game).filter(Boolean))].sort();

  return {
    players,
    games,
    imageBase: IMAGE_BASE,
    portraitsMatched,
    buckets: buckets.size,
    gameVersion: display.game_version,
    portraitIndexSize: portraits.size,
  };
}

/* ── Passives ─────────────────────────────────────────────────────────────── */

/**
 * Dataminer passives carry magnitude (`value`) and text, but not the structured
 * scope/stat/condition model the synergy engine needs. Effects ship empty until
 * that model is extracted from the game. Character → passive is still open too.
 */
/**
 * Les préfixes viennent du jeu : `mps` = manager passive skill, `cps` = coach
 * passive skill (les variantes `b…` sont les versions Basara). C'est une lecture
 * des préfixes, pas une preuve tirée du contenu — les deux catalogues décrivent
 * des effets d'équipe très semblables et ne se départagent pas à la lecture.
 */
function passiveSourceFromStringId(stringId: string): PassiveSource {
  const id = stringId.toLowerCase();
  if (id.startsWith("mps") || id.startsWith("bmps")) return "manager";
  if (id.startsWith("cps") || id.startsWith("bcps")) return "coach";
  // Remaining (ps*, hps*, ss*, swap*, …) — player catalogue. The 6th "custom"
  // UI slot reuses the player list (see passiveSourceFor).
  return "player";
}

function buildPassives(display: Bundle): Passive[] {
  const passives: Passive[] = [];
  let number = 0;

  for (const r of display.passives) {
    number++;
    const value = r.value == null ? 0 : roundValue(num(r.value));
    // Substitute the magnitude into the text before stripping other markup.
    const rawName = (r.name ?? "").replace(/<VALUE>/gi, value ? String(value) : "?");
    const description = cleanText(rawName).replace(/\s+/g, " ").trim() || r.string_id;

    passives.push({
      id: r.string_id,
      number,
      source: passiveSourceFromStringId(r.string_id),
      buildType: null,
      description,
      // Game value is the reference magnitude; user can still override in the UI.
      strongValue: value,
      weakValue: value,
      effects: [],
    });
  }

  passives.sort((a, b) => a.source.localeCompare(b.source) || a.number - b.number);
  return passives;
}

/* ── Equipment ────────────────────────────────────────────────────────────── */

async function loadEquipmentImages(): Promise<Map<string, string>> {
  const file = Bun.file(new URL("equipment-images.json", RAW));
  if (!(await file.exists())) return new Map();

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

async function buildEquipment(display: Bundle, en: Bundle) {
  const images = await loadEquipmentImages();
  // Join icons via English names (Inazugle scrape is English).
  const enByStringId = new Map(en.equipment.map((e) => [e.string_id, e]));

  let matched = 0;
  const equipment: Equipment[] = [];

  for (const r of display.equipment) {
    const slot = EQUIPMENT_SLOT_MAP[r.slot];
    if (!slot) {
      problems.push(`equipment ${r.string_id}: unknown slot ${JSON.stringify(r.slot)}`);
      continue;
    }

    const stats: Partial<BaseStats> = {};
    let total = 0;
    for (const key of STAT_KEYS) {
      const value = num(r.stats[key]);
      if (value !== 0) {
        stats[key] = value;
        total += value;
      }
    }

    const enName = enByStringId.get(r.string_id)?.name ?? r.name;
    const image = images.get(`${slot}:${loosely(cleanText(enName))}`);
    if (image) matched++;

    equipment.push({
      id: r.string_id,
      slot,
      name: cleanText(r.name),
      description: cleanText(r.description),
      shop: "",
      stats,
      total,
      ...(image ? { image } : {}),
    });
  }

  equipment.sort(
    (a, b) => a.slot.localeCompare(b.slot) || b.total - a.total || a.name.localeCompare(b.name),
  );
  return { equipment, matched };
}

/* ── Hissatsu (abilities) ─────────────────────────────────────────────────── */

/**
 * Le catalogue des techniques, fusionné depuis les **trois** tables du jeu.
 *
 * Les slots d'un personnage pointent indifféremment vers `hissatsu`,
 * `aura_hissatsu` ou `auras`, et les ids ne se chevauchent pas — une seule Map
 * suffit donc. Mais n'en lire qu'une perd un slot sur trois sans rien signaler :
 * `auras` pèse à elle seule 22 % des références. D'où la validation en aval,
 * qui fait échouer le build plutôt que d'afficher des trous.
 *
 * Les noms sont multi-langue : on fusionne fr / en / ja par id pour que le
 * switch de locale UI renomme vraiment les techniques (sinon tout reste en
 * LANG de build).
 */
async function buildAbilities(display: Bundle, locales: Record<"fr" | "en" | "ja", Bundle>) {
  const abilities: Ability[] = [];
  const seen = new Set<string>();

  /** id → locale → cleaned name */
  const namesById = new Map<string, Partial<Record<"fr" | "en" | "ja", string>>>();
  for (const locale of ["fr", "en", "ja"] as const) {
    const bundle = locales[locale];
    const tables = [bundle.hissatsu, bundle.aura_hissatsu, bundle.auras as RawAura[]];
    for (const rows of tables) {
      for (const r of rows) {
        const id = String(r.id);
        const name = cleanText(r.name);
        if (!name) continue;
        const entry = namesById.get(id) ?? {};
        entry[locale] = name;
        namesById.set(id, entry);
      }
    }
  }

  const sources: [AbilityKind, (RawHissatsu | RawAura)[]][] = [
    ["hissatsu", display.hissatsu],
    ["auraHissatsu", display.aura_hissatsu],
    ["aura", display.auras as RawAura[]],
  ];

  for (const [kind, rows] of sources) {
    for (const r of rows) {
      const id = String(r.id);
      if (seen.has(id)) {
        problems.push(`ability ${id}: id present in more than one table`);
        continue;
      }
      seen.add(id);

      const where = `${kind} ${r.id}`;
      // Une aura n'a ni catégorie ni puissance : c'est un esprit, pas un tir.
      const isAura = kind === "aura";
      const category = isAura ? "Aura" : HISSATSU_CATEGORY[(r as RawHissatsu).category];
      if (!category) problems.push(`${where}: unknown category ${(r as RawHissatsu).category}`);

      const move = r as RawHissatsu;
      const auraType = isAura ? mapAuraType((r as RawAura).type, where) : null;
      const names = namesById.get(id) ?? {};
      const name = names[LANG] || names.en || names.fr || names.ja || cleanText(r.name) || id;

      abilities.push({
        id,
        name,
        names,
        kind,
        auraType,
        type: category ?? "Unknown",
        element: mapElement(r.element, `${where}.element`),
        power: num(move.power),
        tension: num(move.tp_consumption),
        extra: [
          move.is_longshot ? "Long shot" : "",
          move.is_block ? "Block" : "",
          move.cooldown != null ? `CD ${move.cooldown}` : "",
        ]
          .filter(Boolean)
          .join(" · "),
        shop: "",
      });
    }
  }

  abilities.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  return abilities;
}

function skillSetOf(
  raw: RawCharacter,
  known: Set<string>,
  where: string,
): { skills: LearnedSkill[]; skillsAlt: LearnedSkill[] } {
  return {
    skills: mapSkills(raw.skills, known, `${where}.skills`),
    skillsAlt: mapSkills(raw.skills_alt, known, `${where}.skills_alt`),
  };
}

/** Les huit mécaniques sont fermées : une neuvième doit faire échouer le build. */
function mapAuraType(raw: string | undefined, where: string): AuraType | null {
  if (!raw) {
    problems.push(`${where}: aura sans type`);
    return null;
  }
  if ((AURA_TYPES as readonly string[]).includes(raw)) return raw as AuraType;
  problems.push(`${where}: type d'aura inconnu ${JSON.stringify(raw)}`);
  return null;
}

/** `[niveau, id]` → forme nommée, en refusant tout id inconnu du catalogue. */
function mapSkills(
  raw: [number, number][] | undefined,
  known: Set<string>,
  where: string,
): LearnedSkill[] {
  const out: LearnedSkill[] = [];
  for (const pair of raw ?? []) {
    const [level, id] = pair;
    const abilityId = String(id);
    if (!known.has(abilityId)) {
      problems.push(`${where}: skill ${abilityId} absent des trois tables de techniques`);
      continue;
    }
    out.push({ level: num(level), abilityId });
  }
  return out.sort((a, b) => a.level - b.level);
}

/* ── Synergies & tactics (data for later UI; shipped so it is not lost) ───── */

async function buildSynergies(display: Bundle) {
  return display.synergies.map((s) => ({
    id: s.string_id,
    name: cleanText(s.name),
    description: cleanText(s.description),
    members: s.members,
    memberNames: (s.member_names ?? []).map(cleanText),
  }));
}

async function buildTactics(display: Bundle) {
  // Collapse `_st` situational reskins onto the base string id.
  const byBase = new Map<string, RawTactic>();
  for (const t of display.tactics) {
    if (t.string_id.startsWith("test_")) continue;
    const base = t.string_id.split("_st")[0]!;
    if (!byBase.has(base)) byBase.set(base, { ...t, string_id: base });
  }

  return [...byBase.values()].map((t) => ({
    id: t.string_id,
    name: cleanText(t.name),
    description: cleanText(t.description),
    tpCost: roundValue(num(t.tp_cost)),
  }));
}

/* ── Icons ────────────────────────────────────────────────────────────────── */

async function copyIcons() {
  const srcRoot = fileURLToPath(new URL("icons/", RAW));
  const dstRoot = fileURLToPath(ICONS_OUT);

  await rm(dstRoot, { recursive: true, force: true });
  await mkdir(dstRoot, { recursive: true });

  // Ship everything, including unlabelled `passives/` (atlas cell ≠ game id —
  // usable as art, not as a join key). See data/raw/icons/README.md.
  const folders = ["elements", "styles", "hissatsu", "aura", "positions", "tactics", "passives"];
  let count = 0;

  for (const folder of folders) {
    const from = join(srcRoot, folder);
    const to = join(dstRoot, folder);
    await mkdir(to, { recursive: true });
    let entries: string[];
    try {
      entries = await readdir(from);
    } catch {
      problems.push(`icons/${folder}: missing`);
      continue;
    }
    for (const name of entries) {
      if (!name.endsWith(".png")) continue;
      await cp(join(from, name), join(to, name));
      count++;
    }
  }

  return count;
}

/* ── Write + run ──────────────────────────────────────────────────────────── */

async function write(name: string, data: unknown) {
  const json = JSON.stringify(data);
  await Bun.write(new URL(name, OUT), json);
  return json.length;
}

await rm(fileURLToPath(new URL("players/", OUT)), { recursive: true, force: true });
await mkdir(fileURLToPath(new URL("players/", OUT)), { recursive: true });

const display = await readRawJson<Bundle>(`dataminer/ievr.${LANG}.json`);
const en = await readRawJson<Bundle>(`dataminer/ievr.${JOIN_LANG}.json`);
const ja = await readRawJson<Bundle>(`dataminer/ievr.ja.json`);
const fr = LANG === "fr" ? display : await readRawJson<Bundle>(`dataminer/ievr.fr.json`);

if (display.lang !== LANG) {
  problems.push(`expected lang ${LANG}, got ${display.lang}`);
}

for (const [code, name] of Object.entries(display.legend.element)) {
  const expected = ELEMENT_BY_CODE[Number(code)];
  const asElement =
    name === "unknown"
      ? null
      : ((
          { wind: "Wind", forest: "Forest", fire: "Fire", mountain: "Mountain" } as Record<
            string,
            Element | null
          >
        )[name] ?? null);
  if (expected !== undefined && asElement !== expected) {
    problems.push(`legend.element[${code}]=${name} disagrees with ELEMENT_BY_CODE`);
  }
}

// Le catalogue passe avant les joueurs : c'est lui qui rend une référence de
// technique vérifiable, donc une référence inconnue échoue au lieu de passer.
const abilities = await buildAbilities(display, { fr, en, ja });
const knownAbilityIds = new Set(abilities.map((a) => a.id));

const { players, games, imageBase, portraitsMatched, buckets, gameVersion, portraitIndexSize } =
  await buildPlayers(display, en, knownAbilityIds);
const passives = buildPassives(display);
const { equipment, matched: equipmentIcons } = await buildEquipment(display, en);
const synergies = await buildSynergies(display);
const tactics = await buildTactics(display);
const iconCount = await copyIcons();

const sizes = {
  "players.json": await write("players.json", players),
  "passives.json": await write("passives.json", passives),
  "equipment.json": await write("equipment.json", equipment),
  "abilities.json": await write("abilities.json", abilities),
  "synergies.json": await write("synergies.json", synergies),
  "tactics.json": await write("tactics.json", tactics),
  "meta.json": await write("meta.json", {
    generatedAt: new Date().toISOString(),
    source: "dataminer",
    gameVersion,
    lang: LANG,
    imageBase,
    games,
    detailBucketSize: DETAIL_BUCKET_SIZE,
    counts: {
      players: players.length,
      passives: passives.length,
      equipment: equipment.length,
      abilities: abilities.length,
      synergies: synergies.length,
      tactics: tactics.length,
      heroes: players.filter((p) => p.heroStats).length,
      basaras: players.filter((p) => p.basaraStats).length,
      portraits: portraitsMatched,
      portraitIndex: portraitIndexSize,
      icons: iconCount,
    },
  }),
};

const kb = (n: number) => `${(n / 1024).toFixed(0)} KB`;
console.log(`source      dataminer ${gameVersion} (${LANG}) — no community`);
console.log(
  `players     ${String(players.length).padStart(5)}  ${kb(sizes["players.json"])}   ` +
    `(${portraitsMatched}/${portraitIndexSize || "?"} portraits Inazugle` +
    (portraitIndexSize === 0 ? "; lance `bun run data:player-images`" : "") +
    `)`,
);
console.log(`  heroes    ${String(players.filter((p) => p.heroStats).length).padStart(5)}`);
console.log(`  basaras   ${String(players.filter((p) => p.basaraStats).length).padStart(5)}`);
console.log(
  `passives    ${String(passives.length).padStart(5)}  ${kb(sizes["passives.json"])}   ` +
    `(dataminer — effects vides, moteur en attente du modèle jeu)`,
);
console.log(
  `equipment   ${String(equipment.length).padStart(5)}  ${kb(sizes["equipment.json"])}   ` +
    `(${equipmentIcons} icônes, ${equipment.length - equipmentIcons} sans)`,
);
console.log(`abilities   ${String(abilities.length).padStart(5)}  ${kb(sizes["abilities.json"])}`);
console.log(`synergies   ${String(synergies.length).padStart(5)}  ${kb(sizes["synergies.json"])}`);
console.log(`tactics     ${String(tactics.length).padStart(5)}  ${kb(sizes["tactics.json"])}`);
console.log(`icons              ${iconCount} files → public/icons/`);
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
