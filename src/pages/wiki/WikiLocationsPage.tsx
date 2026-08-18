import { useDeferredValue, useMemo, useState } from "react";
import { Link } from "react-router";
import { Search } from "lucide-react";

import { FilterChip, Panel, PanelMeta } from "@/components/ui";
import { useDataset } from "@/data/useDataset";
import { locationDisplayName } from "@/domain/locations";
import { LOCATION_KINDS, type GameLocation, type LocationKind } from "@/domain/types";
import { useI18n } from "@/i18n";
import { cn, formatNumber } from "@/lib/ui";

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

const KIND_LABEL: Record<LocationKind, "wiki.foundIn.match" | "wiki.foundIn.universe"> = {
  match: "wiki.foundIn.match",
  universe: "wiki.foundIn.universe",
};

/**
 * The drop locations, read the other way round: not "where do I find this
 * player" but "I am at this battle, who does it hand out".
 */
export function WikiLocationsPage() {
  const { t, locale } = useI18n();
  const dataset = useDataset();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<LocationKind | null>(null);
  const deferredQuery = useDeferredValue(query);

  const results = useMemo(() => {
    const needle = fold(deferredQuery.trim());
    return dataset.locations
      .filter((location) => {
        if (kind && location.kind !== kind) return false;
        if (!needle) return true;
        const names = [location.name, ...Object.values(location.names)];
        return names.some((n) => fold(n).includes(needle)) || fold(location.id).includes(needle);
      })
      .sort(
        (a, b) =>
          b.playerCount - a.playerCount ||
          (locationDisplayName(a, locale) ?? "").localeCompare(
            locationDisplayName(b, locale) ?? "",
            locale,
          ),
      );
  }, [dataset.locations, deferredQuery, kind, locale]);

  return (
    <div className="scroll-slim flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs">
        <Link to="/wiki" className="text-ink-500 no-underline hover:text-bolt-ink">
          {t("wiki.title")}
        </Link>
        <span className="text-ink-700">/</span>
        <span className="text-ink-300">{t("wiki.locations")}</span>
      </div>

      <Panel
        title={t("wiki.locations")}
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

        <div className="flex flex-wrap gap-1" role="group" aria-label={t("wiki.locationKind")}>
          <FilterChip active={kind === null} onClick={() => setKind(null)}>
            {t("wiki.allKinds")}
          </FilterChip>
          {LOCATION_KINDS.map((value) => (
            <FilterChip key={value} active={kind === value} onClick={() => setKind(value)}>
              {t(KIND_LABEL[value])}
            </FilterChip>
          ))}
        </div>

        <ul className="scroll-slim min-h-0 flex-1 divide-y divide-ink-850 overflow-y-auto border-2 border-ink-800">
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-xs text-ink-500">{t("wiki.empty")}</li>
          ) : (
            results.map((location) => <LocationRow key={location.id} location={location} />)
          )}
        </ul>
      </Panel>
    </div>
  );
}

function LocationRow({ location }: { location: GameLocation }) {
  const { t, locale } = useI18n();
  const name = locationDisplayName(location, locale);

  return (
    <li>
      <Link
        to={`/wiki/locations/${encodeURIComponent(location.id)}`}
        className={cn(
          "flex items-start gap-3 px-3 py-2 no-underline transition-colors",
          "hover:bg-ink-850",
        )}
      >
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block font-display text-sm font-bold uppercase italic",
              name ? "text-ink-50" : "text-ink-500 italic",
            )}
          >
            {name ?? t("wiki.foundIn.unnamed")}
          </span>
          <span className="mt-0.5 block truncate text-xs text-ink-500">
            {t(KIND_LABEL[location.kind])}
          </span>
        </span>
        <span className="shrink-0 pt-0.5 font-display text-[11px] font-bold text-ink-500 tnum uppercase">
          {t("wiki.playersCount", { n: location.playerCount })}
        </span>
      </Link>
    </li>
  );
}
