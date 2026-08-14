import { computePower, type PowerKey } from "@/domain/stats";
import type { BuildType, Element, Gender, Player, Position } from "@/domain/types";
import { localizedSearchBlob, matchesTeamFilter } from "@/i18n";

export type PlayerSortKey = "total" | PowerKey;

export interface PlayerFilters {
  query: string;
  position: Position | null;
  element: Element | null;
  buildType: BuildType | null;
  game: string | null;
  team: string | null;
  gender: Gender | null;
  spiritOnly: boolean;
  heroForm: boolean;
  basaraForm: boolean;
  sort: PlayerSortKey;
}

function foldSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function filterAndSortPlayers(players: Player[], filters: PlayerFilters) {
  const needle = foldSearch(filters.query.trim());
  const matches = players.filter((player) => {
    if (filters.position && player.position !== filters.position) return false;
    if (filters.element && player.element !== filters.element) return false;
    if (filters.buildType && player.buildType !== filters.buildType) return false;
    if (filters.game && player.game !== filters.game) return false;
    if (filters.team && !matchesTeamFilter(player, filters.team)) return false;
    if (filters.gender && player.gender !== filters.gender) return false;
    if (filters.spiritOnly && !player.spiritDrop) return false;
    if (filters.heroForm && !player.heroStats) return false;
    if (filters.basaraForm && !player.basaraStats) return false;
    if (!needle) return true;

    const teamHit = [player.team, ...Object.values(player.teamNames)].some((name) =>
      foldSearch(name).includes(needle),
    );
    return (
      foldSearch(localizedSearchBlob(player.names, player.name)).includes(needle) ||
      foldSearch(localizedSearchBlob(player.nicknames, player.nickname)).includes(needle) ||
      foldSearch(player.nameOriginal).includes(needle) ||
      teamHit
    );
  });

  if (filters.sort === "total") {
    matches.sort((left, right) => right.total - left.total);
  } else {
    const powerKey = filters.sort;
    matches.sort(
      (left, right) => computePower(right.stats)[powerKey] - computePower(left.stats)[powerKey],
    );
  }

  return matches;
}
