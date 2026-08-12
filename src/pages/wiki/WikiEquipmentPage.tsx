import { useDeferredValue, useMemo, useState } from "react";
import { Link } from "react-router";
import { Search } from "lucide-react";

import { FilterChip, Panel, PanelHint, PanelMeta } from "@/components/ui";
import { useDataset } from "@/data/useDataset";
import { imageUrl } from "@/data/load";
import { EQUIPMENT_SLOTS, type Equipment, type EquipmentSlot } from "@/domain/types";
import { equipmentDisplayName, localizedSearchBlob, useI18n } from "@/i18n";
import { equipmentSlotLabel, statLabel } from "@/i18n/labels";
import { STAT_KEYS } from "@/domain/stats";
import { cn, formatNumber } from "@/lib/ui";

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** Searchable equipment catalogue by slot. */
export function WikiEquipmentPage() {
  const { t, locale } = useI18n();
  const dataset = useDataset();
  const [query, setQuery] = useState("");
  const [slot, setSlot] = useState<EquipmentSlot | "">("");
  const deferredQuery = useDeferredValue(query);

  const results = useMemo(() => {
    const needle = fold(deferredQuery.trim());
    return dataset.equipment
      .filter((item) => {
        if (slot && item.slot !== slot) return false;
        if (!needle) return true;
        return (
          fold(localizedSearchBlob(item.names, item.name)).includes(needle) ||
          fold(localizedSearchBlob(item.descriptions, item.description)).includes(needle) ||
          fold(item.shop).includes(needle) ||
          item.id.includes(needle)
        );
      })
      .sort(
        (a, b) =>
          b.total - a.total ||
          equipmentDisplayName(a, locale).localeCompare(equipmentDisplayName(b, locale), locale),
      );
  }, [dataset.equipment, deferredQuery, slot, locale]);

  return (
    <div className="scroll-slim flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs">
        <Link to="/wiki" className="text-ink-500 no-underline hover:text-bolt-400">
          {t("wiki.title")}
        </Link>
        <span className="text-ink-700">/</span>
        <span className="text-ink-300">{t("wiki.equipment")}</span>
      </div>

      <Panel
        title={t("wiki.equipment")}
        action={
          <PanelMeta>{t("wiki.count", { n: formatNumber(results.length, locale) })}</PanelMeta>
        }
        bodyClassName="flex min-h-0 flex-1 flex-col gap-3"
        className="flex min-h-0 flex-1 flex-col"
      >
        <PanelHint>{t("wiki.equipmentHint")}</PanelHint>

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

        <div className="flex flex-wrap gap-1">
          <FilterChip active={slot === ""} onClick={() => setSlot("")}>
            {t("wiki.allSlots")}
          </FilterChip>
          {EQUIPMENT_SLOTS.map((s) => (
            <FilterChip key={s} active={slot === s} onClick={() => setSlot(s)}>
              {equipmentSlotLabel(t, s)}
            </FilterChip>
          ))}
        </div>

        <ul className="scroll-slim min-h-0 flex-1 divide-y divide-ink-850 overflow-y-auto border-2 border-ink-800">
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-xs text-ink-500">{t("wiki.empty")}</li>
          ) : (
            results.map((item) => (
              <EquipmentRow key={item.id} item={item} imageBase={dataset.imageBase} />
            ))
          )}
        </ul>
      </Panel>
    </div>
  );
}

function EquipmentRow({ item, imageBase }: { item: Equipment; imageBase: string }) {
  const { t, locale } = useI18n();
  const name = equipmentDisplayName(item, locale);
  const topStats = STAT_KEYS.filter((k) => (item.stats[k] ?? 0) > 0).slice(0, 3);

  return (
    <li>
      <Link
        to={`/wiki/equipment/${encodeURIComponent(item.id)}`}
        className={cn(
          "flex items-center gap-3 px-3 py-2 no-underline transition-colors",
          "hover:bg-ink-850",
        )}
      >
        {item.image ? (
          <img
            src={imageUrl(imageBase, item.image, 48)}
            alt=""
            width={32}
            height={32}
            className="size-8 shrink-0 border border-ink-700 object-contain bg-ink-950"
          />
        ) : (
          <span className="flex size-8 shrink-0 items-center justify-center border border-ink-800 bg-ink-950 text-[10px] text-ink-600">
            —
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-sm font-bold uppercase italic">
            {name}
          </span>
          <span className="block text-[11px] text-ink-500">
            {equipmentSlotLabel(t, item.slot)}
            {topStats.length > 0 && (
              <>
                {" · "}
                {topStats.map((k) => `+${item.stats[k]} ${statLabel(t, k)}`).join(", ")}
              </>
            )}
          </span>
        </span>
        <span className="shrink-0 font-display text-sm font-bold tnum text-bolt-400">
          +{formatNumber(item.total, locale)}
        </span>
      </Link>
    </li>
  );
}
