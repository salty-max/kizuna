import { useDeferredValue, useMemo, useState } from "react";
import { Link } from "react-router";
import { Search } from "lucide-react";

import { TacticIcon } from "@/components/GameIcon";
import { FilterChip, Panel, PanelMeta } from "@/components/ui";
import { useDataset } from "@/data/useDataset";
import type { Tactic } from "@/domain/types";
import { localizedSearchBlob, tacticDisplayDescription, tacticDisplayName, useI18n } from "@/i18n";
import { cn, formatNumber } from "@/lib/ui";

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** Searchable tactics catalogue. */
export function WikiTacticsPage() {
  const { t, locale } = useI18n();
  const dataset = useDataset();
  const [query, setQuery] = useState("");
  const [tp, setTp] = useState<number | "">("");
  const deferredQuery = useDeferredValue(query);

  const tpBuckets = useMemo(() => {
    const set = new Set(dataset.tactics.map((x) => x.tpCost));
    return [...set].sort((a, b) => a - b);
  }, [dataset.tactics]);

  const results = useMemo(() => {
    const needle = fold(deferredQuery.trim());
    return dataset.tactics
      .filter((tactic) => {
        if (tp !== "" && tactic.tpCost !== tp) return false;
        if (!needle) return true;
        return (
          fold(localizedSearchBlob(tactic.names, tactic.name)).includes(needle) ||
          fold(localizedSearchBlob(tactic.descriptions, tactic.description)).includes(needle) ||
          tactic.id.includes(needle)
        );
      })
      .sort(
        (a, b) =>
          a.tpCost - b.tpCost ||
          tacticDisplayName(a, locale).localeCompare(tacticDisplayName(b, locale), locale),
      );
  }, [dataset.tactics, deferredQuery, tp, locale]);

  return (
    <div className="scroll-slim flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs">
        <Link to="/wiki" className="text-ink-500 no-underline hover:text-bolt-ink">
          {t("wiki.title")}
        </Link>
        <span className="text-ink-500">/</span>
        <span className="text-ink-300">{t("wiki.tactics")}</span>
      </div>

      <Panel
        title={t("wiki.tactics")}
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

        <div className="flex flex-wrap gap-1" role="group" aria-label={t("wiki.filterTp")}>
          <FilterChip active={tp === ""} onClick={() => setTp("")}>
            {t("wiki.allTp")}
          </FilterChip>
          {tpBuckets.map((cost) => (
            <FilterChip
              key={cost}
              active={tp === cost}
              onClick={() => setTp(cost)}
              title={t("app.tacticTp", { n: cost })}
            >
              <span className="tnum">{formatTp(cost, locale)}</span>
            </FilterChip>
          ))}
        </div>

        <ul className="scroll-slim min-h-0 flex-1 divide-y divide-ink-850 overflow-y-auto border-2 border-ink-800">
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-xs text-ink-500">{t("wiki.empty")}</li>
          ) : (
            results.map((tactic) => <TacticRow key={tactic.id} tactic={tactic} />)
          )}
        </ul>
      </Panel>
    </div>
  );
}

function formatTp(cost: number, locale: string): string {
  if (cost >= 99999) return "∞";
  return formatNumber(cost, locale as "fr" | "en" | "ja");
}

function TacticRow({ tactic }: { tactic: Tactic }) {
  const { t, locale } = useI18n();
  const name = tacticDisplayName(tactic, locale);
  const description = tacticDisplayDescription(tactic, locale);

  return (
    <li>
      <Link
        to={`/wiki/tactics/${encodeURIComponent(tactic.id)}`}
        className={cn(
          "flex items-center gap-3 px-3 py-2 no-underline transition-colors",
          "hover:bg-ink-850",
        )}
      >
        <TacticIcon tacticId={tactic.id} size={28} title={name} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-sm font-bold uppercase italic">
            {name}
          </span>
          {description && (
            <span className="mt-0.5 line-clamp-1 block text-[11px] text-ink-500 whitespace-pre-line">
              {description}
            </span>
          )}
        </span>
        <span className="shrink-0 font-display text-xs font-bold tnum text-ink-400">
          {tactic.tpCost >= 99999
            ? "∞"
            : t("app.tacticTp", { n: formatNumber(tactic.tpCost, locale) })}
        </span>
      </Link>
    </li>
  );
}
