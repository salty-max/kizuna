import { computePower } from "@/domain/stats";
import type { Player } from "@/domain/types";
import { playerDisplayName, useI18n } from "@/i18n";
import { seriesShortLabel } from "@/i18n/labels";
import { formatNumber } from "@/lib/ui";
import { ElementBadge, PositionBadge, StyleBadge } from "../GameIcon";
import { PlayerAvatar } from "../PlayerAvatar";
import type { PlayerSortKey } from "./filterPlayers";
import { PLAYER_ROW_HEIGHT, useVirtualRows } from "./useVirtualRows";

interface Props {
  players: Player[];
  totalPlayers: number;
  imageBase: string;
  sort: PlayerSortKey;
  showOriginalNames: boolean;
  onPick: (player: Player) => void;
}

export function PlayerPickerResults({
  players,
  totalPlayers,
  imageBase,
  sort,
  showOriginalNames,
  onPick,
}: Props) {
  const { t, locale } = useI18n();
  const { scrollRef, range, onScroll } = useVirtualRows(players.length);

  return (
    <>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="scroll-slim min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {players.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-500">{t("picker.none")}</p>
        ) : (
          <div style={{ height: players.length * PLAYER_ROW_HEIGHT, position: "relative" }}>
            <div
              style={{
                transform: `translateY(${range.start * PLAYER_ROW_HEIGHT}px)`,
                position: "absolute",
                insetInline: 0,
              }}
            >
              {players.slice(range.start, range.end).map((player) => (
                <PlayerRow
                  key={player.id}
                  player={player}
                  imageBase={imageBase}
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
          n: players.length,
          shown: formatNumber(players.length, locale),
          total: formatNumber(totalPlayers, locale),
        })}
      </footer>
    </>
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
  sort: PlayerSortKey;
  showOriginalNames: boolean;
  onPick: () => void;
}) {
  const { locale } = useI18n();
  const power = computePower(player.stats);
  const displayName = playerDisplayName(player, showOriginalNames, locale);
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
      style={{ height: PLAYER_ROW_HEIGHT }}
      className="flex w-full items-center gap-3 border-b border-ink-800 px-3 text-left transition-colors hover:bg-ink-850 last:border-0"
    >
      <PlayerAvatar player={player} imageBase={imageBase} size={36} displayName={displayName} />

      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-sm font-bold uppercase italic">
          {displayName}
        </span>
        <span className="block truncate text-xs text-ink-500">
          {[secondary, player.team, seriesShortLabel(player.game) || player.game]
            .filter(Boolean)
            .join(" · ")}
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
