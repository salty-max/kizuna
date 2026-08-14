/**
 * Turns `data/raw/` into the artifacts the app actually fetches, in `public/data/`.
 *
 * Source of truth: the datamined bundles in `data/raw/dataminer/` (the game's own
 * files) plus Inazugle portrait (`player-images.json`) and equipment-icon
 * (`equipment-images.json`) indexes. No community dump.
 *
 * Still aborts on any enum-ish value it does not recognise. An upstream refresh
 * that adds a new element or passive scope must fail here, loudly.
 */

import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { parsePassiveEffectsFromEn } from "../src/domain/passiveParse";
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
  type Gender,
  type LocalizedNames,
  type Passive,
  type PassiveSource,
  type Player,
  type PlayerDetails,
  type Position,
} from "../src/domain/types";
import { STAT_KEYS, totalOf, type BaseStats } from "../src/domain/stats";
import { encodePlayerShard } from "../src/data/player-shard";

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
  nickname?: string;
  nickname_plain?: string;
  surname?: string;
  surname_plain?: string;
  given_name?: string;
  given_name_plain?: string;
  description?: string | null;
  description_plain?: string;
  series?: string;
  series_plain?: string;
  /** Dump strings: `male` / `female` / `other`. */
  gender?: string;
  element: number;
  main_position: number;
  alt_position?: number;
  style: number;
  team?: string;
  team_id?: number;
  emblem?: string;
  emblem_era?: string;
  /** Character can appear as a spirit drop. */
  spirit_drop?: boolean;
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
 * Inazugle scrape (`bun run data:player-images`) — portraits only.
 * Gender now comes from the dataminer dump; the scrape may still carry a
 * legacy `gender` field that we ignore at join time.
 * Keyed by normalised English name.
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

/**
 * Resolve a portrait path (relative to `IMAGE_BASE`) by trying every localised
 * name form — EN first (Inazugle join key), then the rest.
 */
function portraitFor(portraits: Map<string, string>, candidates: string[]): string {
  for (const raw of candidates) {
    const name = raw.replace(/\s+/g, " ").trim();
    if (!name) continue;
    const scraped = portraits.get(normalizeName(name));
    if (!scraped) continue;
    return scraped.startsWith(IMAGE_BASE) ? scraped.slice(IMAGE_BASE.length) : scraped;
  }
  return "";
}

/** Dump `male` / `female` / `other` → app Gender. */
function mapGender(raw: string | undefined, where: string): Gender {
  switch ((raw ?? "").toLowerCase()) {
    case "male":
      return "Male";
    case "female":
      return "Female";
    case "other":
      return "Neutral";
    case "":
    case undefined:
      return "Unknown";
    default:
      problems.push(`${where}: unknown gender ${JSON.stringify(raw)}`);
      return "Unknown";
  }
}

/**
 * Test / dummy rows the dump still ships. Parenthetical "for X" Japanese names
 * and a handful of VR debug kraken variants are not real roster picks.
 */
function isJunkPlayer(player: Pick<Player, "id" | "name" | "names" | "nameOriginal">): boolean {
  const blob = [player.name, player.nameOriginal, ...Object.values(player.names ?? {})].join(" ");
  if (/（[^）]*用）/.test(blob)) return true;
  if (/ジグザグドリブル/.test(blob)) return true;
  if (/\(test\)|dummy|ダミー/i.test(blob)) return true;
  // Known VR debug / non-playable kraken shells (no Inazugle art either).
  if (player.id === 4743 || player.id === 4939 || player.id === 4949 || player.id === 5794) {
    return true;
  }
  return false;
}

/**
 * Two roster rows that share this fingerprint are the same mechanical character
 * under different series/team labels (Protocol Omega vs 3.0, pure Ares clones…).
 * Different move trees or stats → different fingerprint → both stay.
 */
function playerFingerprint(player: Player): string {
  return JSON.stringify({
    name: normalizeName(player.name),
    original: normalizeName(player.nameOriginal),
    position: player.position,
    element: player.element,
    buildType: player.buildType,
    stats: player.stats,
    skills: player.skills,
    skillsAlt: player.skillsAlt,
  });
}

/** Prefer playable, illustrated Victory Road rows when collapsing exact clones. */
function clonePreference(player: Player): number {
  let score = 0;
  if (player.image) score += 100;
  if (/Victory Road/i.test(player.game)) score += 80;
  if (/Arès|Ares/i.test(player.game)) score += 30;
  if (/Galaxy/i.test(player.game)) score += 20;
  if (/GO 2/i.test(player.game)) score += 15;
  if (/\bGO\b/i.test(player.game)) score += 10;
  if (player.heroStats) score += 25;
  if (player.basaraStats) score += 25;
  if (
    player.team &&
    !/Personnage secondaire|Secondary character|サイドキャラ|Unaffiliated|Non-affili/i.test(
      player.team,
    )
  ) {
    score += 15;
  }
  // Stable tie-break: lower game id first (classic roster).
  score -= player.id / 1_000_000;
  return score;
}

/**
 * Drop junk rows, then keep a single representative per identical mechanical
 * clone group. Series variants with different skills stay — they are real picks.
 */
function finalizePlayers(players: Player[]): {
  players: Player[];
  droppedClones: number;
  junk: number;
} {
  let junk = 0;
  const usable: Player[] = [];
  for (const player of players) {
    if (isJunkPlayer(player)) {
      junk++;
      continue;
    }
    usable.push(player);
  }

  const groups = new Map<string, Player[]>();
  for (const player of usable) {
    const key = playerFingerprint(player);
    const group = groups.get(key);
    if (group) group.push(player);
    else groups.set(key, [player]);
  }

  const kept: Player[] = [];
  let droppedClones = 0;
  for (const group of groups.values()) {
    if (group.length === 1) {
      kept.push(group[0]!);
      continue;
    }
    group.sort((a, b) => clonePreference(b) - clonePreference(a) || a.id - b.id);
    kept.push(group[0]!);
    droppedClones += group.length - 1;
  }

  kept.sort((a, b) => a.id - b.id);
  return { players: kept, droppedClones, junk };
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

type LocaleKey = "fr" | "en" | "ja";
const LOCALES: LocaleKey[] = ["fr", "en", "ja"];

function pickLangText(map: LocalizedNames, fallback = ""): string {
  return map[LANG] || map.en || map.fr || map.ja || fallback;
}

function setLocalized(
  map: Map<string, LocalizedNames>,
  key: string,
  locale: LocaleKey,
  value: string,
) {
  if (!value) return;
  const entry = map.get(key) ?? {};
  entry[locale] = value;
  map.set(key, entry);
}

/** team_id → fr/en/ja club names (same id across the three dataminer bundles). */
function collectTeamNames(locales: Record<LocaleKey, Bundle>): Map<number, LocalizedNames> {
  const map = new Map<number, LocalizedNames>();
  for (const locale of LOCALES) {
    const bundle = locales[locale];
    for (const rows of [bundle.characters, bundle.heroes, bundle.basaras]) {
      for (const row of rows) {
        if (row.team_id == null) continue;
        const name = cleanText(row.team ?? "");
        if (!name) continue;
        const entry = map.get(row.team_id) ?? {};
        entry[locale] = name;
        map.set(row.team_id, entry);
      }
    }
  }
  return map;
}

/** character id → localised display names. */
function collectPlayerNames(locales: Record<LocaleKey, Bundle>): Map<number, LocalizedNames> {
  const map = new Map<number, LocalizedNames>();
  for (const locale of LOCALES) {
    const bundle = locales[locale];
    for (const rows of [bundle.characters, bundle.heroes, bundle.basaras]) {
      for (const row of rows) {
        const name = cleanText(row.name_plain ?? row.name)
          .replace(/\s+/g, " ")
          .trim();
        if (!name) continue;
        const entry = map.get(row.id) ?? {};
        entry[locale] = name;
        map.set(row.id, entry);
      }
    }
  }
  return map;
}

/** character id → the game's localised short pitch name. */
function collectPlayerNicknames(locales: Record<LocaleKey, Bundle>): Map<number, LocalizedNames> {
  const map = new Map<number, LocalizedNames>();
  for (const locale of LOCALES) {
    const bundle = locales[locale];
    for (const rows of [bundle.characters, bundle.heroes, bundle.basaras]) {
      for (const row of rows) {
        const nickname = cleanText(row.nickname_plain ?? row.nickname)
          .replace(/\s+/g, " ")
          .trim();
        if (!nickname) continue;
        const entry = map.get(row.id) ?? {};
        entry[locale] = nickname;
        map.set(row.id, entry);
      }
    }
  }
  return map;
}

/** character id → localised bios. */
function collectPlayerDescriptions(
  locales: Record<LocaleKey, Bundle>,
): Map<number, LocalizedNames> {
  const map = new Map<number, LocalizedNames>();
  for (const locale of LOCALES) {
    const bundle = locales[locale];
    for (const rows of [bundle.characters, bundle.heroes, bundle.basaras]) {
      for (const row of rows) {
        const description = cleanText(row.description_plain ?? row.description);
        if (!description) continue;
        const entry = map.get(row.id) ?? {};
        entry[locale] = description;
        map.set(row.id, entry);
      }
    }
  }
  return map;
}

async function buildPlayers(
  display: Bundle,
  en: Bundle,
  locales: Record<"fr" | "en" | "ja", Bundle>,
  knownAbilityIds: Set<string>,
) {
  const enNameById = new Map(
    en.characters.map((c) => [c.id, c.name.replace(/\s+/g, " ").trim()] as const),
  );
  for (const row of [...en.heroes, ...en.basaras]) {
    if (!enNameById.has(row.id)) {
      enNameById.set(row.id, row.name.replace(/\s+/g, " ").trim());
    }
  }

  const teamNamesById = collectTeamNames(locales);
  const playerNamesById = collectPlayerNames(locales);
  const playerNicknamesById = collectPlayerNicknames(locales);
  const playerDescriptionsById = collectPlayerDescriptions(locales);
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

    const names: LocalizedNames = { ...(playerNamesById.get(id) ?? {}) };
    const nameFromBase = cleanText(base.name_plain ?? base.name)
      .replace(/\s+/g, " ")
      .trim();
    if (nameFromBase && !names[LANG]) names[LANG] = nameFromBase;
    const name = pickLangText(names, nameFromBase) || String(id);
    const nameOriginal = cleanText(base.name_original_plain ?? base.name_original ?? "")
      .replace(/\s+/g, " ")
      .trim();
    const series = cleanText(base.series_plain ?? base.series ?? "");

    const enName = (enNameById.get(id) ?? names.en ?? base.name).replace(/\s+/g, " ").trim();
    const image = portraitFor(portraits, [
      enName,
      names.en ?? "",
      names.fr ?? "",
      names.ja ?? "",
      name,
      nameOriginal,
    ]);
    const nicknames: LocalizedNames = { ...(playerNicknamesById.get(id) ?? {}) };
    const nickname = pickLangText(nicknames, name);
    if (image) portraitsMatched++;
    const gender = mapGender(base.gender, `${where}.gender`);
    const spiritDrop = base.spirit_drop === true;

    const teamId = typeof base.team_id === "number" ? base.team_id : null;
    const teamNames: LocalizedNames =
      teamId != null ? { ...(teamNamesById.get(teamId) ?? {}) } : {};
    // Ensure the build lang has a value even if only this row carried a name.
    const displayTeam = cleanText(base.team ?? "");
    if (displayTeam && !teamNames[LANG]) teamNames[LANG] = displayTeam;
    const team = pickLangText(teamNames, displayTeam);

    players.push({
      id,
      name,
      names,
      nameOriginal,
      nickname,
      nicknames,
      image,
      game: series,
      team,
      teamId,
      teamNames,
      position,
      altPosition,
      element,
      buildType,
      // Game dump has no staff roster; every character row is a field player.
      // The builder therefore keeps staff slots passives-only.
      role: "Player",
      gender,
      spiritDrop,
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

    const descriptions: LocalizedNames = { ...(playerDescriptionsById.get(id) ?? {}) };
    const descriptionFromBase = cleanText(base.description_plain ?? base.description);
    if (descriptionFromBase && !descriptions[LANG]) descriptions[LANG] = descriptionFromBase;
    details.push({
      id,
      description: pickLangText(descriptions, descriptionFromBase),
      descriptions,
      howToObtain: "",
      inazugleLink: "",
    });
  }

  const finalized = finalizePlayers(players);
  const keepIds = new Set(finalized.players.map((p) => p.id));
  const keptDetails = details.filter((d) => keepIds.has(d.id));

  const buckets = new Map<number, PlayerDetails[]>();
  for (const d of keptDetails) {
    const key = Math.floor(d.id / DETAIL_BUCKET_SIZE);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(d);
    else buckets.set(key, [d]);
  }
  for (const [key, rows] of buckets) {
    await write(`players/${key}.json`, rows);
  }

  const games = [...new Set(finalized.players.map((p) => p.game).filter(Boolean))].sort();

  return {
    players: finalized.players,
    games,
    imageBase: IMAGE_BASE,
    portraitsMatched,
    droppedClones: finalized.droppedClones,
    junk: finalized.junk,
    buckets: buckets.size,
    contentVersion: display.game_version,
    portraitIndexSize: portraits.size,
  };
}

/* ── Passives ─────────────────────────────────────────────────────────────── */

/**
 * Prefix → catalogue (HANDOFF 2026-08-11):
 * - `ps*` / `ss*` — player lottery presets (attribute pools, not per-character)
 * - `hps*` — custom / Hero-farmed passives (the free lv-50 slot)
 * - `mps*` / `bmps*` — manager; `cps*` / `bcps*` — coach
 * - `swap*` — placeholder ids, dropped below
 */
function passiveSourceFromStringId(stringId: string): PassiveSource | null {
  const id = stringId.toLowerCase();
  if (id.startsWith("swap")) return null;
  if (id.startsWith("mps") || id.startsWith("bmps")) return "manager";
  if (id.startsWith("cps") || id.startsWith("bcps")) return "coach";
  if (id.startsWith("hps")) return "custom";
  return "player";
}

function passiveText(raw: RawPassive, value: number): string {
  // Substitute the magnitude into the text before stripping other markup.
  const rawName = (raw.name ?? "").replace(/<VALUE>/gi, value ? String(value) : "?");
  return cleanText(rawName).replace(/\s+/g, " ").trim();
}

function buildPassives(display: Bundle, locales: Record<LocaleKey, Bundle>): Passive[] {
  const descriptionsById = new Map<string, LocalizedNames>();
  const valueById = new Map<string, number>();

  for (const locale of LOCALES) {
    for (const r of locales[locale].passives) {
      const value = r.value == null ? 0 : roundValue(num(r.value));
      if (!valueById.has(r.string_id)) valueById.set(r.string_id, value);
      const text = passiveText(r, valueById.get(r.string_id) ?? value);
      setLocalized(descriptionsById, r.string_id, locale, text || r.string_id);
    }
  }

  const passives: Passive[] = [];
  let number = 0;
  let effectsParsed = 0;
  let dropped = 0;

  for (const r of display.passives) {
    const source = passiveSourceFromStringId(r.string_id);
    if (!source) {
      dropped++;
      continue;
    }
    number++;
    const value = valueById.get(r.string_id) ?? (r.value == null ? 0 : roundValue(num(r.value)));
    const descriptions = { ...(descriptionsById.get(r.string_id) ?? {}) };
    const description = pickLangText(descriptions, r.string_id);
    // EN grammar is regular enough to recover scope/stat/conditions; FR is not.
    const enText = descriptions.en || "";
    const effects = enText ? parsePassiveEffectsFromEn(enText) : [];
    if (effects.length > 0) effectsParsed++;

    const tierRow = r.tiers?.[0];
    const family = tierRow && Number.isFinite(tierRow.family) ? tierRow.family : null;
    const tier = tierRow && Number.isFinite(tierRow.tier) ? tierRow.tier : null;

    passives.push({
      id: r.string_id,
      number,
      source,
      buildType: null,
      description,
      descriptions,
      family,
      tier,
      // Game value is the reference magnitude; UI can scale via family/tier.
      strongValue: value,
      weakValue: value,
      effects,
    });
  }

  passives.sort((a, b) => a.source.localeCompare(b.source) || a.number - b.number);
  const bySource = Object.fromEntries(
    (["player", "custom", "coach", "manager"] as const).map((s) => [
      s,
      passives.filter((p) => p.source === s).length,
    ]),
  );
  console.log(
    `  passives   effects ${effectsParsed}/${passives.length} ` +
      `(${((100 * effectsParsed) / Math.max(1, passives.length)).toFixed(0)}% EN) ` +
      `· sources ${JSON.stringify(bySource)}` +
      (dropped ? ` · dropped ${dropped} swap*` : ""),
  );
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

async function buildEquipment(display: Bundle, locales: Record<LocaleKey, Bundle>) {
  const images = await loadEquipmentImages();
  // Join icons via English names (Inazugle scrape is English).
  const enByStringId = new Map(locales.en.equipment.map((e) => [e.string_id, e]));

  const namesById = new Map<string, LocalizedNames>();
  const descriptionsById = new Map<string, LocalizedNames>();
  for (const locale of LOCALES) {
    for (const row of locales[locale].equipment) {
      setLocalized(namesById, row.string_id, locale, cleanText(row.name));
      setLocalized(descriptionsById, row.string_id, locale, cleanText(row.description));
    }
  }

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

    const names = { ...(namesById.get(r.string_id) ?? {}) };
    const descriptions = { ...(descriptionsById.get(r.string_id) ?? {}) };
    const name = pickLangText(names, cleanText(r.name));
    const description = pickLangText(descriptions, cleanText(r.description));

    const enName = enByStringId.get(r.string_id)?.name ?? r.name;
    const image = images.get(`${slot}:${loosely(cleanText(enName))}`);
    if (image) matched++;

    equipment.push({
      id: r.string_id,
      slot,
      name,
      names,
      description,
      descriptions,
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
async function buildAbilities(display: Bundle, locales: Record<LocaleKey, Bundle>) {
  const abilities: Ability[] = [];
  const seen = new Set<string>();

  /** id → locale → cleaned name / description */
  const namesById = new Map<string, LocalizedNames>();
  const descriptionsById = new Map<string, LocalizedNames>();
  for (const locale of LOCALES) {
    const bundle = locales[locale];
    const tables = [bundle.hissatsu, bundle.aura_hissatsu, bundle.auras as RawAura[]];
    for (const rows of tables) {
      for (const r of rows) {
        const id = String(r.id);
        setLocalized(namesById, id, locale, cleanText(r.name));
        setLocalized(descriptionsById, id, locale, cleanText(r.description));
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
      const names = { ...(namesById.get(id) ?? {}) };
      const descriptions = { ...(descriptionsById.get(id) ?? {}) };
      const name = pickLangText(names, cleanText(r.name) || id);
      const description = pickLangText(descriptions, cleanText(r.description));

      abilities.push({
        id,
        name,
        names,
        description,
        descriptions,
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

function tacticBaseId(stringId: string): string {
  return stringId.split("_st")[0]!;
}

async function buildSynergies(display: Bundle, locales: Record<LocaleKey, Bundle>) {
  const namesById = new Map<string, LocalizedNames>();
  const descriptionsById = new Map<string, LocalizedNames>();
  for (const locale of LOCALES) {
    for (const s of locales[locale].synergies) {
      setLocalized(namesById, s.string_id, locale, cleanText(s.name));
      setLocalized(descriptionsById, s.string_id, locale, cleanText(s.description));
    }
  }

  return display.synergies.map((s) => {
    const names = { ...(namesById.get(s.string_id) ?? {}) };
    const descriptions = { ...(descriptionsById.get(s.string_id) ?? {}) };
    return {
      id: s.string_id,
      kind: s.string_id.startsWith("sf") ? "offensive" : "defensive",
      name: pickLangText(names, cleanText(s.name)),
      names,
      description: pickLangText(descriptions, cleanText(s.description)),
      descriptions,
      members: s.members,
      memberNames: (s.member_names ?? []).map(cleanText),
    };
  });
}

async function buildTactics(display: Bundle, locales: Record<LocaleKey, Bundle>) {
  // Collapse `_st` situational reskins onto the base string id.
  const byBase = new Map<string, RawTactic>();
  for (const t of display.tactics) {
    if (t.string_id.startsWith("test_")) continue;
    const base = tacticBaseId(t.string_id);
    if (!byBase.has(base)) byBase.set(base, { ...t, string_id: base });
  }

  const namesById = new Map<string, LocalizedNames>();
  const descriptionsById = new Map<string, LocalizedNames>();
  for (const locale of LOCALES) {
    for (const t of locales[locale].tactics) {
      if (t.string_id.startsWith("test_")) continue;
      const base = tacticBaseId(t.string_id);
      // Prefer the non-reskin row for each locale when present.
      const existing = namesById.get(base)?.[locale];
      if (existing && t.string_id.includes("_st")) continue;
      setLocalized(namesById, base, locale, cleanText(t.name));
      setLocalized(descriptionsById, base, locale, cleanText(t.description));
    }
  }

  return [...byBase.values()].map((t) => {
    const names = { ...(namesById.get(t.string_id) ?? {}) };
    const descriptions = { ...(descriptionsById.get(t.string_id) ?? {}) };
    return {
      id: t.string_id,
      name: pickLangText(names, cleanText(t.name)),
      names,
      description: pickLangText(descriptions, cleanText(t.description)),
      descriptions,
      tpCost: roundValue(num(t.tp_cost)),
    };
  });
}

/* ── Icons ────────────────────────────────────────────────────────────────── */

async function copyIcons() {
  const srcRoot = fileURLToPath(new URL("icons/", RAW));
  const dstRoot = fileURLToPath(ICONS_OUT);

  await rm(dstRoot, { recursive: true, force: true });
  await mkdir(dstRoot, { recursive: true });

  // Ship everything, including unlabelled `passives/` (atlas cell ≠ game id —
  // usable as art, not as a join key). See data/raw/icons/README.md.
  const folders = [
    "elements",
    "styles",
    "hissatsu",
    "aura",
    "positions",
    "tactics",
    "passives",
    "gender",
  ];
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

const {
  players,
  games,
  imageBase,
  portraitsMatched,
  droppedClones,
  junk: junkPlayers,
  buckets,
  contentVersion,
  portraitIndexSize,
} = await buildPlayers(display, en, { fr, en, ja }, knownAbilityIds);
const passives = buildPassives(display, { fr, en, ja });
const { equipment, matched: equipmentIcons } = await buildEquipment(display, { fr, en, ja });
const synergies = await buildSynergies(display, { fr, en, ja });
const tactics = await buildTactics(display, { fr, en, ja });
const iconCount = await copyIcons();

const sizes = {
  "players.json": await write("players.json", encodePlayerShard(players)),
  "passives.json": await write("passives.json", passives),
  "equipment.json": await write("equipment.json", equipment),
  "abilities.json": await write("abilities.json", abilities),
  "synergies.json": await write("synergies.json", synergies),
  "tactics.json": await write("tactics.json", tactics),
  "meta.json": await write("meta.json", {
    generatedAt: new Date().toISOString(),
    source: "dataminer",
    // The dump calls this `game_version`, but it is an internal content build
    // marker, not the public client patch number (for example 7.1.2).
    contentVersion,
    // Legacy alias for consumers of older generated metadata.
    gameVersion: contentVersion,
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
console.log(`source      latest client · content ${contentVersion} (${LANG}) — no community`);
console.log(
  `players     ${String(players.length).padStart(5)}  ${kb(sizes["players.json"])}   ` +
    `(${portraitsMatched}/${portraitIndexSize || "?"} portraits Inazugle` +
    (portraitIndexSize === 0 ? "; lance `bun run data:player-images`" : "") +
    (droppedClones ? `; −${droppedClones} clones` : "") +
    (junkPlayers ? `; −${junkPlayers} junk` : "") +
    `)`,
);
console.log(`  heroes    ${String(players.filter((p) => p.heroStats).length).padStart(5)}`);
console.log(`  basaras   ${String(players.filter((p) => p.basaraStats).length).padStart(5)}`);
console.log(
  `passives    ${String(passives.length).padStart(5)}  ${kb(sizes["passives.json"])}   ` +
    `(effects from EN text parser)`,
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
