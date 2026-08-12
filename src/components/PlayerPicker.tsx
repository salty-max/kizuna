import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";

import { computePower, POWER_KEYS, type PowerKey } from "@/domain/stats";
import {
  BUILD_TYPES,
  ELEMENTS,
  POSITIONS,
  type BuildType,
  type Dataset,
  type Element,
  type Player,
  type Position,
} from "@/domain/types";
import { playerDisplayName, useI18n } from "@/i18n";
import { buildTypeLabel, elementLabel, powerLabel } from "@/i18n/labels";
import { ELEMENT_STYLES, cn, formatNumber } from "@/lib/ui";
import { ElementBadge, PositionBadge, StyleBadge } from "./GameIcon";
import { FilterChip, IconButton, Select, TextInput } from "./ui";
import { PlayerAvatar } from "./PlayerAvatar";

const ROW_HEIGHT = 56;
const OVERSCAN = 6;

type SortKey = "total" | PowerKey;

interface Props {
  dataset: Dataset;
  /** Highlighted as the shape's intent; never used to restrict the list. */
  suggestedPosition: Position | null;
  onPick: (player: Player) => void;
  onClose: () => void;
}

export function PlayerPicker({ dataset, suggestedPosition, onPick, onClose }: Props) {
  const { t, locale, showOriginalNames } = useI18n();
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<Position | null>(suggestedPosition);
  const [element, setElement] = useState<Element | null>(null);
  const [buildType, setBuildType] = useState<BuildType | null>(null);
  const [game, setGame] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("total");

  // 4840 rows re-filtered on every keystroke would stutter; let React keep the
  // input responsive and catch the list up a frame later.
  const deferredQuery = useDeferredValue(query);

  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const results = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();

    const matches = dataset.players.filter((player) => {
      if (position && player.position !== position) return false;
      if (element && player.element !== element) return false;
      if (buildType && player.buildType !== buildType) return false;
      if (game && player.game !== game) return false;
      if (needle === "") return true;
      return (
        player.name.toLowerCase().includes(needle) ||
        player.nickname.toLowerCase().includes(needle) ||
        player.nameOriginal.toLowerCase().includes(needle)
      );
    });

    if (sort === "total") {
      matches.sort((a, b) => b.total - a.total);
    } else {
      matches.sort((a, b) => computePower(b.stats)[sort] - computePower(a.stats)[sort]);
    }
    return matches;
  }, [dataset.players, deferredQuery, position, element, buildType, game, sort]);

  const { scrollRef, range, onScroll } = useVirtualRows(results.length);

  return (
    <div
      className="overlay flex items-start justify-center p-4 sm:p-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal max-w-4xl">
        <header className="flex items-center gap-2 border-b-2 border-ink-800 p-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-500" />
            <TextInput
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("picker.search")}
              className="w-full pl-8"
            />
          </div>
          <IconButton onClick={onClose} aria-label={t("picker.close")}>
            <X className="size-4" />
          </IconButton>
        </header>

        <div className="flex flex-wrap items-center gap-1.5 border-b-2 border-ink-800 p-3">
          <FilterGroup
            values={POSITIONS}
            active={position}
            onChange={setPosition}
            label={() => ""}
            icon={(value) => <PositionBadge position={value} variant="badge" size={16} />}
            ariaLabel={(value) => value}
          />
          <Divider />
          <FilterGroup
            values={ELEMENTS}
            active={element}
            onChange={setElement}
            label={(value) => elementLabel(t, value)}
            className={(value) => ELEMENT_STYLES[value].text}
            icon={(value) => <ElementBadge element={value} variant="icon" size={14} />}
          />
          <Divider />
          <FilterGroup
            values={BUILD_TYPES}
            active={buildType}
            onChange={setBuildType}
            label={(value) => buildTypeLabel(t, value)}
            icon={(value) => <StyleBadge buildType={value} variant="icon" size={14} />}
          />

          <div className="ml-auto flex items-center gap-2">
            <Select
              value={game ?? ""}
              options={[
                { value: "", label: t("picker.allGames") },
                ...dataset.games.map((name) => ({ value: name, label: name })),
              ]}
              onChange={(next) => setGame(next || null)}
              aria-label={t("picker.allGames")}
              className="w-52"
            />
            <Select
              value={sort}
              options={[
                { value: "total", label: t("picker.sortTotal") },
                ...POWER_KEYS.map((key) => ({
                  value: key,
                  label: t("picker.sortBy", { stat: powerLabel(t, key) }),
                })),
              ]}
              onChange={(next) => setSort(next as SortKey)}
              aria-label={t("picker.sortTotal")}
              className="w-44"
            />
          </div>
        </div>

        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="scroll-slim min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          {results.length === 0 ? (
            <p className="p-8 text-center text-sm text-ink-500">{t("picker.none")}</p>
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
                    sort={sort}
                    showOriginalNames={showOriginalNames}
                    onPick={() => onPick(player)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <footer className="border-t-2 border-ink-800 px-3 py-2 font-display text-[11px] font-bold tracking-wide text-ink-500 uppercase italic tnum">
          {t("picker.count", {
            n: results.length,
            shown: formatNumber(results.length, locale),
            total: formatNumber(dataset.players.length, locale),
          })}
        </footer>
      </div>
    </div>
  );
}

function PlayerRow({
  player,
  imageBase,
  sort,
  showOriginalNames,
  onPick,
}: {
  player: Player;
  imageBase: string;
  sort: SortKey;
  showOriginalNames: boolean;
  onPick: () => void;
}) {
  const power = computePower(player.stats);
  const displayName = playerDisplayName(player, showOriginalNames);
  const secondary =
    showOriginalNames && player.nameOriginal && player.nameOriginal !== player.name
      ? player.name
      : !showOriginalNames && player.nameOriginal && player.nameOriginal !== player.name
        ? player.nameOriginal
        : null;

  return (
    <button
      type="button"
      onClick={onPick}
      style={{ height: ROW_HEIGHT }}
      className="flex w-full items-center gap-3 border-b border-ink-800 px-3 text-left transition-colors hover:bg-ink-850 last:border-0"
    >
      <PlayerAvatar player={player} imageBase={imageBase} size={36} displayName={displayName} />

      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-sm font-bold uppercase italic">
          {displayName}
        </span>
        <span className="block truncate text-xs text-ink-500">
          {secondary ? `${secondary} · ${player.game}` : player.game}
        </span>
      </span>

      <PositionBadge position={player.position} variant="badge" size={18} />

      <ElementBadge element={player.element} variant="icon" size={20} />

      {player.buildType && <StyleBadge buildType={player.buildType} variant="icon" size={16} />}

      <span className="w-20 text-right font-display text-sm font-bold tnum">
        {sort === "total" ? player.total : power[sort]}
      </span>
    </button>
  );
}

function Divider() {
  return <span className="divider-v" />;
}

function FilterGroup<T extends string>({
  values,
  active,
  onChange,
  label,
  className,
  icon,
  ariaLabel,
}: {
  values: readonly T[];
  active: T | null;
  onChange: (value: T | null) => void;
  label: (value: T) => string;
  className?: (value: T) => string;
  icon?: (value: T) => React.ReactNode;
  ariaLabel?: (value: T) => string;
}) {
  return (
    <span className="flex flex-wrap gap-1">
      {values.map((value) => {
        const selected = active === value;
        const text = label(value);
        return (
          <FilterChip
            key={value}
            active={selected}
            aria-label={ariaLabel?.(value) ?? text}
            onClick={() => onChange(selected ? null : value)}
            icon={icon?.(value)}
            className={cn(!selected && className?.(value))}
          >
            {text}
          </FilterChip>
        );
      })}
    </span>
  );
}

/** Minimal fixed-height windowing — enough for one long list, no dependency. */
function useVirtualRows(count: number) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState({ start: 0, end: 30 });

  const measure = () => {
    const element = scrollRef.current;
    if (!element) return;
    const start = Math.max(0, Math.floor(element.scrollTop / ROW_HEIGHT) - OVERSCAN);
    const visible = Math.ceil(element.clientHeight / ROW_HEIGHT) + OVERSCAN * 2;
    setRange({ start, end: Math.min(count, start + visible) });
  };

  useEffect(measure, [count]);

  // Filtering can shorten the list under a scrolled-down viewport.
  useEffect(() => {
    const element = scrollRef.current;
    if (element && element.scrollTop > count * ROW_HEIGHT) element.scrollTop = 0;
  }, [count]);

  return { scrollRef, range, onScroll: measure };
}
