import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";

import { computePower, POWER_KEYS, POWER_LABELS, type PowerKey } from "@/domain/stats";
import {
  BUILD_TYPES,
  BUILD_TYPE_LABELS,
  ELEMENTS,
  POSITIONS,
  type BuildType,
  type Dataset,
  type Element,
  type Player,
  type Position,
} from "@/domain/types";
import {
  ELEMENT_KANJI,
  ELEMENT_LABELS,
  ELEMENT_STYLES,
  POSITION_STYLE,
  cn,
  formatNumber,
} from "@/lib/ui";
import { ElementBadge } from "./ElementIcon";
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
      if (player.role !== "Player") return false;
      if (position && player.position !== position) return false;
      if (element && player.element !== element) return false;
      if (buildType && player.buildType !== buildType) return false;
      if (game && player.game !== game) return false;
      if (needle === "") return true;
      return (
        player.name.toLowerCase().includes(needle) ||
        player.nickname.toLowerCase().includes(needle)
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
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink-950/80 p-4 backdrop-blur-sm sm:p-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="panel flex max-h-full w-full max-w-4xl flex-col overflow-hidden shadow-2xl">
        <header className="flex items-center gap-2 border-b border-ink-800 p-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-500" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un personnage…"
              className="field w-full pl-8"
            />
          </div>
          <button type="button" onClick={onClose} className="btn px-2" aria-label="Fermer">
            <X className="size-4" />
          </button>
        </header>

        <div className="flex flex-wrap items-center gap-1.5 border-b border-ink-800 p-3">
          <FilterGroup
            values={POSITIONS}
            active={position}
            onChange={setPosition}
            label={(value) => value}
          />
          <Divider />
          <FilterGroup
            values={ELEMENTS}
            active={element}
            onChange={setElement}
            label={(value) => ELEMENT_LABELS[value]}
            className={(value) => ELEMENT_STYLES[value].text}
            icon={(value) => <span className="kanji">{ELEMENT_KANJI[value]}</span>}
          />
          <Divider />
          <FilterGroup
            values={BUILD_TYPES}
            active={buildType}
            onChange={setBuildType}
            label={(value) => BUILD_TYPE_LABELS[value]}
          />

          <div className="ml-auto flex items-center gap-2">
            <select
              value={game ?? ""}
              onChange={(event) => setGame(event.target.value || null)}
              className="field max-w-52 py-1"
            >
              <option value="">Tous les jeux</option>
              {dataset.games.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              className="field py-1"
            >
              <option value="total">Trier : total</option>
              {POWER_KEYS.map((key) => (
                <option key={key} value={key}>
                  Trier : {POWER_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="scroll-slim min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          {results.length === 0 ? (
            <p className="p-8 text-center text-sm text-ink-500">Aucun personnage ne correspond.</p>
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
                    onPick={() => onPick(player)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <footer className="border-t border-ink-800 px-3 py-2 text-xs text-ink-500 tnum">
          {formatNumber(results.length)} personnage{results.length > 1 ? "s" : ""} sur{" "}
          {formatNumber(dataset.players.filter((p) => p.role === "Player").length)}
        </footer>
      </div>
    </div>
  );
}

function PlayerRow({
  player,
  imageBase,
  sort,
  onPick,
}: {
  player: Player;
  imageBase: string;
  sort: SortKey;
  onPick: () => void;
}) {
  const power = computePower(player.stats);

  return (
    <button
      type="button"
      onClick={onPick}
      style={{ height: ROW_HEIGHT }}
      className="flex w-full items-center gap-3 px-3 text-left transition-colors hover:bg-ink-850"
    >
      <PlayerAvatar player={player} imageBase={imageBase} size={36} />

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{player.name}</span>
        <span className="block truncate text-xs text-ink-500">{player.game}</span>
      </span>

      <span
        className={cn(
          "rounded border px-1.5 py-0.5 text-[11px] font-semibold",
          POSITION_STYLE,
        )}
      >
        {player.position}
      </span>

      <ElementBadge element={player.element} className="w-24 justify-center text-xs" />

      <span className="w-20 text-right text-sm font-semibold tnum">
        {sort === "total" ? player.total : power[sort]}
      </span>
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px bg-ink-800" />;
}

function FilterGroup<T extends string>({
  values,
  active,
  onChange,
  label,
  className,
  icon,
}: {
  values: readonly T[];
  active: T | null;
  onChange: (value: T | null) => void;
  label: (value: T) => string;
  className?: (value: T) => string;
  icon?: (value: T) => React.ReactNode;
}) {
  return (
    <span className="flex flex-wrap gap-1">
      {values.map((value) => {
        const selected = active === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(selected ? null : value)}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
              selected
                ? "border-bolt-500/50 bg-bolt-500/15 text-bolt-400"
                : cn("border-ink-800 bg-ink-850 text-ink-300 hover:bg-ink-800", className?.(value)),
            )}
          >
            {icon?.(value)}
            {label(value)}
          </button>
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
