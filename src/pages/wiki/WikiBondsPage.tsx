import { useDeferredValue, useMemo, useState } from "react";
import { Link } from "react-router";
import { Search } from "lucide-react";

import { Panel, PanelMeta } from "@/components/ui";
import { useDataset } from "@/data/useDataset";
import type { BondSynergy, Player } from "@/domain/types";
import { bondDisplayName, localizedSearchBlob, playerDisplayName, useI18n } from "@/i18n";
import { cn, formatNumber } from "@/lib/ui";

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** Character bond / kizuna catalogue. */
export function WikiBondsPage() {
  const { t, locale } = useI18n();
  const dataset = useDataset();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const playersById = useMemo(
    () => new Map(dataset.players.map((p) => [p.id, p])),
    [dataset.players],
  );

  const results = useMemo(() => {
    const needle = fold(deferredQuery.trim());
    return dataset.synergies
      .filter((bond) => {
        if (!needle) return true;
        if (fold(localizedSearchBlob(bond.names, bond.name)).includes(needle)) return true;
        if (fold(bond.id).includes(needle)) return true;
        if (fold(localizedSearchBlob(bond.descriptions, bond.description)).includes(needle)) {
          return true;
        }
        return bond.memberNames.some((n) => fold(n).includes(needle));
      })
      .sort(
        (a, b) =>
          b.members.length - a.members.length ||
          bondDisplayName(a, locale).localeCompare(bondDisplayName(b, locale), locale),
      );
  }, [dataset.synergies, deferredQuery, locale]);

  return (
    <div className="scroll-slim flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs">
        <Link to="/wiki" className="text-ink-500 no-underline hover:text-bolt-ink">
          {t("wiki.title")}
        </Link>
        <span className="text-ink-500">/</span>
        <span className="text-ink-300">{t("wiki.bonds")}</span>
      </div>

      <Panel
        title={t("wiki.bonds")}
        action={
          <PanelMeta>{t("wiki.count", { n: formatNumber(results.length, locale) })}</PanelMeta>
        }
        bodyClassName="flex min-h-0 flex-1 flex-col gap-3"
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="field relative flex items-center gap-2">
          <Search className="size-3.5 shrink-0 text-ink-500" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("wiki.search")}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-500"
            aria-label={t("wiki.search")}
          />
        </div>

        <ul className="scroll-slim min-h-0 flex-1 divide-y divide-ink-850 overflow-y-auto border-2 border-ink-800">
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-xs text-ink-500">{t("wiki.empty")}</li>
          ) : (
            results.map((bond) => <BondRow key={bond.id} bond={bond} playersById={playersById} />)
          )}
        </ul>
      </Panel>
    </div>
  );
}

function BondRow({ bond, playersById }: { bond: BondSynergy; playersById: Map<number, Player> }) {
  const { t, locale, showOriginalNames } = useI18n();
  const name = bondDisplayName(bond, locale);

  const memberLabels = bond.members.map((id, index) => {
    const player = playersById.get(id);
    if (player) return playerDisplayName(player, showOriginalNames, locale);
    return bond.memberNames[index] || String(id);
  });

  return (
    <li>
      <Link
        to={`/wiki/bonds/${encodeURIComponent(bond.id)}`}
        className={cn(
          "flex items-start gap-3 px-3 py-2 no-underline transition-colors",
          "hover:bg-ink-850",
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block font-display text-sm font-bold uppercase italic text-ink-50">
            {name}
          </span>
          <span className="mt-0.5 block truncate text-xs text-ink-500">
            {memberLabels.join(" · ")}
          </span>
        </span>
        <span className="shrink-0 pt-0.5 font-display text-[11px] font-bold text-ink-500 tnum uppercase">
          {t("wiki.membersCount", { n: formatNumber(bond.members.length, locale) })}
        </span>
      </Link>
    </li>
  );
}
