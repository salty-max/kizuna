import { useDeferredValue, useMemo, useState } from "react";
import { Link } from "react-router";
import { Search } from "lucide-react";

import { FilterChip, Panel, PanelMeta } from "@/components/ui";
import { useDataset } from "@/data/useDataset";
import { PASSIVE_SOURCES, type Passive, type PassiveSource } from "@/domain/types";
import { localizedSearchBlob, passiveDisplayDescription, useI18n } from "@/i18n";
import { cn, formatNumber } from "@/lib/ui";

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** Searchable passive catalogue by staff/player source. */
export function WikiPassivesPage() {
  const { t, locale } = useI18n();
  const dataset = useDataset();
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<PassiveSource | "">("");
  /** "" = all, "parsed" = has effects, "unparsed" = text only. */
  const [effectsFilter, setEffectsFilter] = useState<"" | "parsed" | "unparsed">("");
  const deferredQuery = useDeferredValue(query);

  const availableSources = useMemo(() => {
    const present = new Set(dataset.passives.map((p) => p.source));
    return PASSIVE_SOURCES.filter((s) => present.has(s));
  }, [dataset.passives]);

  const results = useMemo(() => {
    const needle = fold(deferredQuery.trim());
    return dataset.passives
      .filter((passive) => {
        if (source && passive.source !== source) return false;
        const hasEffects = passive.effects.length > 0;
        if (effectsFilter === "parsed" && !hasEffects) return false;
        if (effectsFilter === "unparsed" && hasEffects) return false;
        if (!needle) return true;
        return (
          fold(localizedSearchBlob(passive.descriptions, passive.description)).includes(needle) ||
          fold(passive.id).includes(needle) ||
          String(passive.number).includes(needle)
        );
      })
      .sort(
        (a, b) =>
          a.number - b.number || a.source.localeCompare(b.source) || a.id.localeCompare(b.id),
      );
  }, [dataset.passives, deferredQuery, source, effectsFilter]);

  return (
    <div className="scroll-slim flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs">
        <Link to="/wiki" className="text-ink-500 no-underline hover:text-bolt-400">
          {t("wiki.title")}
        </Link>
        <span className="text-ink-700">/</span>
        <span className="text-ink-300">{t("wiki.passives")}</span>
      </div>

      <Panel
        title={t("wiki.passives")}
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

        <div className="flex flex-wrap gap-1" role="group" aria-label={t("wiki.filterSource")}>
          <FilterChip active={source === ""} onClick={() => setSource("")}>
            {t("wiki.allSources")}
          </FilterChip>
          {availableSources.map((s) => (
            <FilterChip key={s} active={source === s} onClick={() => setSource(s)}>
              {t(`wiki.passiveSource.${s}`)}
            </FilterChip>
          ))}
        </div>

        <div className="flex flex-wrap gap-1" role="group" aria-label={t("wiki.filterEffects")}>
          <FilterChip active={effectsFilter === ""} onClick={() => setEffectsFilter("")}>
            {t("wiki.allEffects")}
          </FilterChip>
          <FilterChip
            active={effectsFilter === "parsed"}
            onClick={() => setEffectsFilter("parsed")}
          >
            {t("wiki.effectsParsed")}
          </FilterChip>
          <FilterChip
            active={effectsFilter === "unparsed"}
            onClick={() => setEffectsFilter("unparsed")}
          >
            {t("wiki.effectsUnparsed")}
          </FilterChip>
        </div>

        <ul className="scroll-slim min-h-0 flex-1 divide-y divide-ink-850 overflow-y-auto border-2 border-ink-800">
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-xs text-ink-500">{t("wiki.empty")}</li>
          ) : (
            results.map((passive) => <PassiveRow key={passive.id} passive={passive} />)
          )}
        </ul>
      </Panel>
    </div>
  );
}

function formatPassiveValue(passive: Passive, locale: "fr" | "en" | "ja"): string {
  const weak = formatBound(passive.weakValue, locale);
  const strong = formatBound(passive.strongValue, locale);
  if (passive.weakValue === passive.strongValue) return `${strong} %`;
  return `${weak}–${strong} %`;
}

/** Keep decimals (1.2 %) — `formatNumber` rounds to integers. */
function formatBound(value: number, locale: "fr" | "en" | "ja"): string {
  const sep = locale === "fr" ? "," : ".";
  return String(value).replace(".", sep);
}

function PassiveRow({ passive }: { passive: Passive }) {
  const { t, locale } = useI18n();
  const description = passiveDisplayDescription(passive, locale);
  const hasEffects = passive.effects.length > 0;

  return (
    <li>
      <Link
        to={`/wiki/passives/${encodeURIComponent(passive.id)}`}
        className={cn(
          "flex items-start gap-3 px-3 py-2 no-underline transition-colors",
          "hover:bg-ink-850",
        )}
      >
        <span className="w-10 shrink-0 pt-0.5 text-center font-display text-xs font-bold text-ink-500 tnum">
          #{passive.number}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-ink-100">{description}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-ink-500">
            <span className="rounded border border-ink-700 px-1.5 py-0.5 uppercase">
              {t(`wiki.passiveSource.${passive.source}`)}
            </span>
            <span
              className={cn(
                "rounded border px-1.5 py-0.5 uppercase",
                hasEffects ? "border-bolt-500/40 text-bolt-300" : "border-ink-700 text-ink-500",
              )}
            >
              {hasEffects ? t("wiki.effectsParsed") : t("wiki.effectsUnparsed")}
            </span>
            <span className="font-display tnum">{formatPassiveValue(passive, locale)}</span>
          </span>
        </span>
      </Link>
    </li>
  );
}
