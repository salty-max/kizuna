import { useMemo } from "react";
import { Link, useParams } from "react-router";

import { PositionBadge } from "@/components/GameIcon";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Callout, DataList, DataRow, Panel } from "@/components/ui";
import { useDataset } from "@/data/useDataset";
import { locationDisplayName } from "@/domain/locations";
import type { LocationKind } from "@/domain/types";
import { playerDisplayName, teamDisplayName, useI18n } from "@/i18n";
import { cn, formatNumber } from "@/lib/ui";

const KIND_LABEL: Record<LocationKind, "wiki.foundIn.match" | "wiki.foundIn.universe"> = {
  match: "wiki.foundIn.match",
  universe: "wiki.foundIn.universe",
};

/** Everyone whose spirit this battle or star sign hands out. */
export function WikiLocationDetailPage() {
  const { id: rawId } = useParams();
  const id = rawId ? decodeURIComponent(rawId) : "";
  const { t, locale, showOriginalNames } = useI18n();
  const dataset = useDataset();
  const location = dataset.locations.find((entry) => entry.id === id) ?? null;

  const players = useMemo(() => {
    if (!location) return [];
    return dataset.players
      .filter((player) => player.foundIn.includes(location.id))
      .sort(
        (a, b) =>
          b.total - a.total ||
          playerDisplayName(a, showOriginalNames, locale).localeCompare(
            playerDisplayName(b, showOriginalNames, locale),
            locale,
          ),
      );
  }, [dataset.players, location, locale, showOriginalNames]);

  if (!location) {
    return (
      <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">
        <Panel title={t("wiki.locations")}>
          <Callout tone="warn">{t("wiki.notFound")}</Callout>
          <Link to="/wiki/locations" className="mt-3 inline-block text-sm text-bolt-ink">
            {t("wiki.backToList")}
          </Link>
        </Panel>
      </div>
    );
  }

  const name = locationDisplayName(location, locale);

  return (
    <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <Link to="/wiki" className="text-ink-500 no-underline hover:text-bolt-ink">
          {t("wiki.title")}
        </Link>
        <span className="text-ink-500">/</span>
        <Link to="/wiki/locations" className="text-ink-500 no-underline hover:text-bolt-ink">
          {t("wiki.locations")}
        </Link>
        <span className="text-ink-500">/</span>
        <span className="truncate text-ink-300">{name ?? t("wiki.foundIn.unnamed")}</span>
      </div>

      <Panel title={name ?? t("wiki.foundIn.unnamed")} bodyClassName="flex flex-col gap-4">
        {!name && <Callout tone="info">{t("wiki.locationUnnamedHint")}</Callout>}

        <DataList>
          <DataRow
            label={t("wiki.field.id")}
            value={<code className="text-xs">{location.id}</code>}
          />
          <DataRow label={t("wiki.locationKind")} value={t(KIND_LABEL[location.kind])} />
          <DataRow
            label={t("wiki.locationPlayers")}
            value={<span className="tnum">{t("wiki.playersCount", { n: players.length })}</span>}
          />
        </DataList>

        <div>
          <h3 className="mb-2 font-display text-xs font-bold tracking-wide text-ink-400 uppercase">
            {t("wiki.locationPlayers")}
          </h3>
          {players.length === 0 ? (
            <p className="text-xs text-ink-500">{t("wiki.locationNoPlayers")}</p>
          ) : (
            <ul className="divide-y divide-ink-850 border-2 border-ink-800">
              {players.map((player) => {
                const label = playerDisplayName(player, showOriginalNames, locale);
                const secondary = [teamDisplayName(player, locale), player.game]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <li key={player.id}>
                    <Link
                      to={`/wiki/players/${player.id}`}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 no-underline transition-colors",
                        "hover:bg-ink-850",
                      )}
                    >
                      <PlayerAvatar
                        player={player}
                        imageBase={dataset.imageBase}
                        size={36}
                        displayName={label}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-sm font-bold uppercase italic">
                          {label}
                        </span>
                        {secondary && (
                          <span className="block truncate text-xs text-ink-500">{secondary}</span>
                        )}
                      </span>
                      <PositionBadge position={player.position} variant="badge" size={18} />
                      <span className="w-12 shrink-0 text-right text-sm tnum">
                        {formatNumber(player.total, locale)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Panel>
    </div>
  );
}
