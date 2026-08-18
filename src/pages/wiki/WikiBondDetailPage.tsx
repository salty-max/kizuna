import { useMemo } from "react";
import { Link, useParams } from "react-router";

import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Callout, DataList, DataRow, Panel } from "@/components/ui";
import { useDataset } from "@/data/useDataset";
import {
  bondDisplayDescription,
  bondDisplayName,
  playerDisplayName,
  teamDisplayName,
  useI18n,
} from "@/i18n";
import { cn, formatNumber } from "@/lib/ui";

export function WikiBondDetailPage() {
  const { id: rawId } = useParams();
  const id = rawId ? decodeURIComponent(rawId) : "";
  const { t, locale, showOriginalNames } = useI18n();
  const dataset = useDataset();
  const bond = dataset.synergies.find((x) => x.id === id) ?? null;

  const playersById = useMemo(
    () => new Map(dataset.players.map((p) => [p.id, p])),
    [dataset.players],
  );

  if (!bond) {
    return (
      <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">
        <Panel title={t("wiki.bonds")}>
          <Callout tone="warn">{t("wiki.notFound")}</Callout>
          <Link to="/wiki/bonds" className="mt-3 inline-block text-sm text-bolt-ink">
            {t("wiki.backToList")}
          </Link>
        </Panel>
      </div>
    );
  }

  const name = bondDisplayName(bond, locale);
  const description = bondDisplayDescription(bond, locale);

  return (
    <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <Link to="/wiki" className="text-ink-500 no-underline hover:text-bolt-ink">
          {t("wiki.title")}
        </Link>
        <span className="text-ink-700">/</span>
        <Link to="/wiki/bonds" className="text-ink-500 no-underline hover:text-bolt-ink">
          {t("wiki.bonds")}
        </Link>
        <span className="text-ink-700">/</span>
        <span className="truncate text-ink-300">{name}</span>
      </div>

      <Panel title={name} bodyClassName="flex flex-col gap-4">
        {description ? (
          <p className="text-sm whitespace-pre-line text-ink-200">{description}</p>
        ) : (
          <p className="text-xs text-ink-500">{t("wiki.bondsNoDescription")}</p>
        )}

        <DataList>
          <DataRow label={t("wiki.field.id")} value={<code className="text-xs">{bond.id}</code>} />
          <DataRow
            label={t("wiki.field.members")}
            value={
              <span className="tnum">
                {t("wiki.membersCount", { n: formatNumber(bond.members.length, locale) })}
              </span>
            }
          />
        </DataList>

        <div>
          <h3 className="mb-2 font-display text-xs font-bold tracking-wide text-ink-400 uppercase">
            {t("wiki.field.members")}
          </h3>
          <ul className="divide-y divide-ink-850 border-2 border-ink-800">
            {bond.members.map((memberId, index) => {
              const player = playersById.get(memberId) ?? null;
              const label = player
                ? playerDisplayName(player, showOriginalNames, locale)
                : (bond.memberNames[index] ?? String(memberId));
              const secondary = player
                ? [teamDisplayName(player, locale), player.game].filter(Boolean).join(" · ")
                : null;

              const inner = (
                <>
                  {player ? (
                    <PlayerAvatar
                      player={player}
                      imageBase={dataset.imageBase}
                      size={36}
                      displayName={label}
                    />
                  ) : (
                    <span className="flex size-9 shrink-0 items-center justify-center border-2 border-ink-700 bg-ink-950 text-[10px] text-ink-500">
                      ?
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-sm font-bold uppercase italic">
                      {label}
                    </span>
                    {secondary && (
                      <span className="block truncate text-xs text-ink-500">{secondary}</span>
                    )}
                  </span>
                  <code className="shrink-0 text-[11px] text-ink-500 tnum">{memberId}</code>
                </>
              );

              return (
                <li key={`${bond.id}-${memberId}`}>
                  {player ? (
                    <Link
                      to={`/wiki/players/${player.id}`}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 no-underline transition-colors",
                        "hover:bg-ink-850",
                      )}
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 px-3 py-2">{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </Panel>
    </div>
  );
}
