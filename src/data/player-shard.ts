import type { BaseStats } from "@/domain/stats";
import type {
  BuildType,
  Element,
  Gender,
  LearnedSkill,
  LocalizedNames,
  Player,
  Position,
  RarityStats,
  Role,
  SkillSet,
} from "@/domain/types";

/** Versioned wire format. The domain keeps readable objects; only transport is compact. */
const PLAYER_SHARD_VERSION = 4 as const;

/**
 * Inazugle fans out its turntable stems into a fixed directory tree built from
 * the stem's own first two characters — `qluc-tlklmm` lives at
 * `1/k/q/l/qluc-tlklmm`, on all 5419 stems in the index. Shipping the prefix
 * would repeat 8 derivable bytes per player for nothing.
 */
const MODEL_STEM_ROOT = "1/k/";

function encodeModelStem(stem: string): string {
  if (!stem) return "";
  const leaf = stem.slice(stem.lastIndexOf("/") + 1);
  return decodeModelStem(leaf) === stem ? leaf : stem;
}

function decodeModelStem(leaf: string): string {
  if (!leaf || leaf.includes("/")) return leaf;
  // Too short to fan out — keep whatever the build shipped rather than
  // fabricating a path out of missing characters.
  if (leaf.length < 2) return leaf;
  return `${MODEL_STEM_ROOT}${leaf[0]}/${leaf[1]}/${leaf}`;
}

type WireStats = [number, number, number, number, number, number, number];
type WireSkill = [level: number, abilityId: string];
type WireSkillSet = [skills: WireSkill[], skillsAlt: WireSkill[]];
type WireRarityStats = [lv50: WireStats, lv99: WireStats];
type WireTeam = [
  id: number | null,
  fallback: string,
  fr: string | null,
  en: string | null,
  ja: string | null,
];

type WirePlayer = [
  id: number,
  fallbackName: string,
  nameFr: string | null,
  nameEn: string | null,
  nameJa: string | null,
  nameOriginal: string,
  image: string,
  gameIndex: number,
  teamIndex: number,
  position: Position,
  altPosition: Position | null,
  element: Element,
  buildType: BuildType | null,
  role: Role,
  gender: Gender,
  spiritDrop: 0 | 1,
  ageGroup: string,
  year: string,
  stats: WireStats,
  statsLv50: WireStats,
  total: number,
  skills: WireSkill[],
  skillsAlt: WireSkill[],
  heroSkills: WireSkillSet | null,
  basaraSkills: WireSkillSet | null,
  heroStats: WireRarityStats | null,
  basaraStats: WireRarityStats | null,
  nickname: string,
  nicknameFr: string | null,
  nicknameEn: string | null,
  nicknameJa: string | null,
  characterId: string,
  /** Turntable stem leaf; the directory prefix is derived at decode. */
  modelStemLeaf: string,
  /** Indices into the shard's `l` dictionary — where this spirit drops. */
  foundIn: number[],
];

export interface PlayerShardV4 {
  v: typeof PLAYER_SHARD_VERSION;
  g: string[];
  t: WireTeam[];
  /** Location ids, interned: 70 values stand in for ~5700 references. */
  l: string[];
  p: WirePlayer[];
}

function encodeStats(stats: BaseStats): WireStats {
  return [
    stats.kick,
    stats.control,
    stats.technique,
    stats.pressure,
    stats.physical,
    stats.agility,
    stats.intelligence,
  ];
}

function decodeStats(stats: WireStats): BaseStats {
  return {
    kick: stats[0],
    control: stats[1],
    technique: stats[2],
    pressure: stats[3],
    physical: stats[4],
    agility: stats[5],
    intelligence: stats[6],
  };
}

function encodeSkills(skills: LearnedSkill[]): WireSkill[] {
  return skills.map((skill) => [skill.level, skill.abilityId]);
}

function decodeSkills(skills: WireSkill[]): LearnedSkill[] {
  return skills.map(([level, abilityId]) => ({ level, abilityId }));
}

function encodeSkillSet(skillSet: SkillSet | null): WireSkillSet | null {
  return skillSet ? [encodeSkills(skillSet.skills), encodeSkills(skillSet.skillsAlt)] : null;
}

function decodeSkillSet(skillSet: WireSkillSet | null): SkillSet | null {
  return skillSet
    ? { skills: decodeSkills(skillSet[0]), skillsAlt: decodeSkills(skillSet[1]) }
    : null;
}

function encodeRarityStats(stats: RarityStats | null): WireRarityStats | null {
  return stats ? [encodeStats(stats.lv50), encodeStats(stats.lv99)] : null;
}

function decodeRarityStats(stats: WireRarityStats | null): RarityStats | null {
  return stats ? { lv50: decodeStats(stats[0]), lv99: decodeStats(stats[1]) } : null;
}

function localizedNames(fr: string | null, en: string | null, ja: string | null): LocalizedNames {
  const names: LocalizedNames = {};
  if (fr !== null) names.fr = fr;
  if (en !== null) names.en = en;
  if (ja !== null) names.ja = ja;
  return names;
}

/** Deduplicate series, teams and locations, then encode rows as positional tuples. */
export function encodePlayerShard(players: Player[]): PlayerShardV4 {
  const games = [...new Set(players.map((player) => player.game))];
  const gameIndexes = new Map(games.map((game, index) => [game, index]));
  const teams: WireTeam[] = [];
  const teamIndexes = new Map<string, number>();
  const locations: string[] = [];
  const locationIndexes = new Map<string, number>();

  const locationIndex = (id: string): number => {
    const existing = locationIndexes.get(id);
    if (existing !== undefined) return existing;
    const next = locations.length;
    locations.push(id);
    locationIndexes.set(id, next);
    return next;
  };

  const teamIndex = (player: Player): number => {
    const key = JSON.stringify([player.teamId, player.team, player.teamNames]);
    const existing = teamIndexes.get(key);
    if (existing !== undefined) return existing;
    const next = teams.length;
    teams.push([
      player.teamId,
      player.team,
      player.teamNames.fr ?? null,
      player.teamNames.en ?? null,
      player.teamNames.ja ?? null,
    ]);
    teamIndexes.set(key, next);
    return next;
  };

  const rows = players.map((player): WirePlayer => [
    player.id,
    player.name,
    player.names.fr ?? null,
    player.names.en ?? null,
    player.names.ja ?? null,
    player.nameOriginal,
    player.image,
    gameIndexes.get(player.game) ?? 0,
    teamIndex(player),
    player.position,
    player.altPosition,
    player.element,
    player.buildType,
    player.role,
    player.gender,
    player.spiritDrop ? 1 : 0,
    player.ageGroup,
    player.year,
    encodeStats(player.stats),
    encodeStats(player.statsLv50),
    player.total,
    encodeSkills(player.skills),
    encodeSkills(player.skillsAlt),
    encodeSkillSet(player.heroSkills),
    encodeSkillSet(player.basaraSkills),
    encodeRarityStats(player.heroStats),
    encodeRarityStats(player.basaraStats),
    player.nickname,
    player.nicknames?.fr ?? null,
    player.nicknames?.en ?? null,
    player.nicknames?.ja ?? null,
    player.characterId,
    encodeModelStem(player.modelStem),
    player.foundIn.map(locationIndex),
  ]);

  // `locations` fills while the rows encode, so the dictionary is only complete
  // once every player has been walked.
  return { v: PLAYER_SHARD_VERSION, g: games, t: teams, l: locations, p: rows };
}

/** Restore the readable domain model and reject incompatible cached artifacts. */
export function decodePlayerShard(input: unknown): Player[] {
  if (!input || typeof input !== "object" || !("v" in input) || input.v !== PLAYER_SHARD_VERSION) {
    throw new Error("players.json: unsupported player shard version");
  }
  const shard = input as PlayerShardV4;
  if (
    !Array.isArray(shard.g) ||
    !Array.isArray(shard.t) ||
    !Array.isArray(shard.l) ||
    !Array.isArray(shard.p)
  ) {
    throw new Error("players.json: malformed player shard");
  }

  return shard.p.map((row) => {
    const team = shard.t[row[8]];
    if (!team || shard.g[row[7]] === undefined) {
      throw new Error(`players.json: invalid dictionary reference for player ${row[0]}`);
    }
    const names = localizedNames(row[2], row[3], row[4]);
    const foundIn = (row[33] ?? []).map((index) => {
      const id = shard.l[index];
      if (id === undefined) {
        throw new Error(`players.json: invalid location reference for player ${row[0]}`);
      }
      return id;
    });
    return {
      id: row[0],
      name: row[1],
      names,
      nameOriginal: row[5],
      nickname: row[27],
      nicknames: localizedNames(row[28], row[29], row[30]),
      image: row[6],
      characterId: row[31] ?? "",
      modelStem: decodeModelStem(row[32] ?? ""),
      foundIn,
      game: shard.g[row[7]]!,
      team: team[1],
      teamId: team[0],
      teamNames: localizedNames(team[2], team[3], team[4]),
      position: row[9],
      altPosition: row[10],
      element: row[11],
      buildType: row[12],
      role: row[13],
      gender: row[14],
      spiritDrop: row[15] === 1,
      ageGroup: row[16],
      year: row[17],
      stats: decodeStats(row[18]),
      statsLv50: decodeStats(row[19]),
      total: row[20],
      skills: decodeSkills(row[21]),
      skillsAlt: decodeSkills(row[22]),
      heroSkills: decodeSkillSet(row[23]),
      basaraSkills: decodeSkillSet(row[24]),
      heroStats: decodeRarityStats(row[25]),
      basaraStats: decodeRarityStats(row[26]),
    };
  });
}
