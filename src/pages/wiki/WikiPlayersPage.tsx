import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { Search } from "lucide-react";

import { ElementBadge, PositionBadge, StyleBadge } from "@/components/GameIcon";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { FilterChip, Panel, PanelHint, PanelMeta, Select } from "@/components/ui";
import { useDataset } from "@/data/useDataset";
import {
  BUILD_TYPES,
  ELEMENTS,
  GENDERS,
  POSITIONS,
  type BuildType,
  type Element,
  type Gender,
  type Player,
  type Position,
} from "@/domain/types";
import {
  localizedSearchBlob,
  matchesTeamFilter,
  playerDisplayName,
  teamDisplayName,
  teamFilterKey,
  useI18n,
} from "@/i18n";
import { buildTypeLabel, elementLabel, genderLabel, seriesShortLabel } from "@/i18n/labels";
import { cn, formatNumber } from "@/lib/ui";

const ROW_HEIGHT = 56;
const OVERSCAN = 8;

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** Virtualised player catalogue — 5k+ rows. */
export function WikiPlayersPage() {
  const { t, locale, showOriginalNames } = useI18n();
  const dataset = useDataset();
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<Position | "">("");
  const [element, setElement] = useState<Element | "">("");
  const [buildType, setBuildType] = useState<BuildType | "">("");
  const [game, setGame] = useState("");
  const [team, setTeam] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const deferredQuery = useDeferredValue(query);

  const teams = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const p of dataset.players) {
      const key = teamFilterKey(p);
      if (!key || byKey.has(key)) continue;
      byKey.set(key, teamDisplayName(p, locale));
    }
    return [...byKey.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, locale));
  }, [dataset.players, locale]);

  const results = useMemo(() => {
    const needle = fold(deferredQuery.trim());
    return dataset.players
      .filter((player) => {
        if (position && player.position !== position) return false;
        if (element && player.element !== element) return false;
        if (buildType && player.buildType !== buildType) return false;
        if (game && player.game !== game) return false;
        if (team && !matchesTeamFilter(player, team)) return false;
        if (gender && player.gender !== gender) return false;
        if (!needle) return true;
        const teamHit = [player.team, ...Object.values(player.teamNames ?? {})].some((n) =>
          fold(n).includes(needle),
        );
        return (
          fold(localizedSearchBlob(player.names, player.name)).includes(needle) ||
          fold(player.nameOriginal).includes(needle) ||
          fold(player.nickname).includes(needle) ||
          teamHit ||
          String(player.id).includes(needle)
        );
      })
      .sort((a, b) => b.total - a.total);
  }, [dataset.players, deferredQuery, position, element, buildType, game, team, gender]);

  const { scrollRef, range, onScroll } = useVirtualRows(results.length);

  return (
    <div className="scroll-slim flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs">
        <Link to="/wiki" className="text-ink-500 no-underline hover:text-bolt-400">
          {t("wiki.title")}
        </Link>
        <span className="text-ink-700">/</span>
        <span className="text-ink-300">{t("wiki.players")}</span>
      </div>

      <Panel
        title={t("wiki.players")}
        action={
          <PanelMeta>{t("wiki.count", { n: formatNumber(results.length, locale) })}</PanelMeta>
        }
        bodyClassName="flex min-h-0 flex-1 flex-col gap-3"
        className="flex min-h-0 flex-1 flex-col"
      >
        <PanelHint>{t("wiki.playersHint")}</PanelHint>

        <div className="flex flex-wrap items-center gap-2">
          <div className="field relative flex min-w-[12rem] flex-1 items-center gap-2">
            <Search className="size-3.5 shrink-0 text-ink-500" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("wiki.search")}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-500"
              aria-label={t("wiki.search")}
            />
          </div>
          <Select
            value={game}
            onChange={setGame}
            className="w-48"
            aria-label={t("picker.allGames")}
            options={[
              { value: "", label: t("picker.allGames") },
              ...dataset.games.map((name) => ({ value: name, label: name })),
            ]}
          />
          <Select
            value={team}
            onChange={setTeam}
            className="w-52"
            searchable
            searchPlaceholder={t("wiki.search")}
            emptyLabel={t("wiki.empty")}
            aria-label={t("picker.allTeams")}
            options={[{ value: "", label: t("picker.allTeams") }, ...teams]}
          />
          <Select
            value={gender}
            onChange={(v) => setGender(v as Gender | "")}
            className="w-40"
            aria-label={t("wiki.filterGender")}
            options={[
              { value: "", label: t("wiki.allGenders") },
              ...GENDERS.map((g) => ({ value: g, label: genderLabel(t, g) })),
            ]}
          />
        </div>

        <div className="flex flex-wrap gap-1" role="group" aria-label={t("wiki.filterPosition")}>
          <FilterChip active={position === ""} onClick={() => setPosition("")}>
            {t("wiki.allPositions")}
          </FilterChip>
          {POSITIONS.map((pos) => (
            <FilterChip
              key={pos}
              active={position === pos}
              onClick={() => setPosition(pos)}
              title={pos}
            >
              <PositionBadge position={pos} variant="badge" size={16} />
            </FilterChip>
          ))}
        </div>

        <div className="flex flex-wrap gap-1" role="group" aria-label={t("wiki.allElements")}>
          <FilterChip active={element === ""} onClick={() => setElement("")}>
            {t("wiki.allElements")}
          </FilterChip>
          {ELEMENTS.map((el) => (
            <FilterChip
              key={el}
              active={element === el}
              onClick={() => setElement(el)}
              title={elementLabel(t, el)}
            >
              <ElementBadge element={el} variant="icon" size={14} />
            </FilterChip>
          ))}
        </div>

        <div className="flex flex-wrap gap-1" role="group" aria-label={t("wiki.filterStyle")}>
          <FilterChip active={buildType === ""} onClick={() => setBuildType("")}>
            {t("wiki.allStyles")}
          </FilterChip>
          {BUILD_TYPES.map((bt) => (
            <FilterChip
              key={bt}
              active={buildType === bt}
              onClick={() => setBuildType(bt)}
              title={buildTypeLabel(t, bt)}
            >
              <StyleBadge buildType={bt} variant="icon" size={14} />
              <span className="hidden sm:inline">{buildTypeLabel(t, bt)}</span>
            </FilterChip>
          ))}
        </div>

        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="scroll-slim min-h-0 flex-1 overflow-y-auto border-2 border-ink-800"
        >
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-ink-500">{t("wiki.empty")}</p>
          ) : (
            <div style={{ height: results.length * ROW_HEIGHT, position: "relative" }}>
              <div
                style={{
                  transform: `translateY(${range.start * ROW_HEIGHT}px)`,
                  position: "absolute",
                  insetInline: 0,
                }}
              >
                {results.slice(range.start, range.end).map((player) => (
                  <PlayerRow
                    key={player.id}
                    player={player}
                    imageBase={dataset.imageBase}
                    showOriginalNames={showOriginalNames}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

function PlayerRow({
  player,
  imageBase,
  showOriginalNames,
}: {
  player: Player;
  imageBase: string;
  showOriginalNames: boolean;
}) {
  const { locale } = useI18n();
  const displayName = playerDisplayName(player, showOriginalNames, locale);
  const teamName = teamDisplayName(player, locale);
  const localName = playerDisplayName(player, false, locale);
  const secondary =
    showOriginalNames && player.nameOriginal && player.nameOriginal !== localName
      ? localName
      : !showOriginalNames && player.nameOriginal && player.nameOriginal !== localName
        ? player.nameOriginal
        : null;

  return (
    <Link
      to={`/wiki/players/${player.id}`}
      style={{ height: ROW_HEIGHT }}
      className={cn(
        "flex w-full items-center gap-3 border-b border-ink-800 px-3 no-underline",
        "transition-colors hover:bg-ink-850 last:border-0",
      )}
    >
      <PlayerAvatar player={player} imageBase={imageBase} size={36} displayName={displayName} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-sm font-bold uppercase italic">
          {displayName}
        </span>
        <span className="block truncate text-xs text-ink-500">
          {[secondary, teamName, seriesShortLabel(player.game) || player.game]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
      <PositionBadge position={player.position} variant="badge" size={18} />
      <ElementBadge element={player.element} variant="icon" size={18} />
      {player.buildType && <StyleBadge buildType={player.buildType} variant="icon" size={16} />}
      <span className="w-16 shrink-0 text-right font-display text-sm font-bold tnum">
        {formatNumber(player.total, locale)}
      </span>
    </Link>
  );
}

function useVirtualRows(count: number) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState(480);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewport(el.clientHeight));
    ro.observe(el);
    setViewport(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  const onScroll = () => {
    if (scrollRef.current) setScrollTop(scrollRef.current.scrollTop);
  };

  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visible = Math.ceil(viewport / ROW_HEIGHT) + OVERSCAN * 2;
  const end = Math.min(count, start + visible);

  return { scrollRef, range: { start, end }, onScroll };
}
