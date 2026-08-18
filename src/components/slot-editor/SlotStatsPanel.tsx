import { useDataset } from "@/data/useDataset";
import { STAT_KEYS } from "@/domain/stats";
import type { ResolvedSlot } from "@/domain/team";
import { useI18n } from "@/i18n";
import { statLabel } from "@/i18n/labels";
import { StatRadar } from "../StatRadar";
import { Panel } from "../ui";

export function SlotStatsPanel({ slot }: { slot: ResolvedSlot }) {
  const { t } = useI18n();
  const dataset = useDataset();

  return (
    <Panel as="h3" title={t("editor.baseStats")}>
      <div className="mb-3 flex justify-center border-b border-ink-800 pb-3">
        <StatRadar
          stats={slot.stats}
          base={
            STAT_KEYS.some((key) => slot.stats[key] !== slot.scaledStats[key])
              ? slot.scaledStats
              : undefined
          }
          size={200}
          max={dataset.statCeiling}
        />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {STAT_KEYS.map((key) => {
          const equipmentBonus = slot.stats[key] - slot.scaledStats[key];
          const scaled = slot.rarity !== "common";
          return (
            <div key={key} className="flex items-baseline justify-between gap-2">
              <dt className="truncate text-xs text-ink-500">{statLabel(t, key)}</dt>
              <dd className="tnum font-medium">
                {scaled && (
                  <span className="mr-1 text-[11px] font-normal text-ink-500">
                    {slot.player?.stats[key]} →
                  </span>
                )}
                {slot.stats[key]}
                {equipmentBonus !== 0 && (
                  <span className="ml-1 text-[11px] text-[var(--color-good)]">
                    +{equipmentBonus}
                  </span>
                )}
              </dd>
            </div>
          );
        })}
        <div className="col-span-2 mt-1 flex items-baseline justify-between border-t border-ink-800 pt-1">
          <dt className="text-xs font-semibold text-ink-300">Total</dt>
          <dd className="tnum font-semibold">{slot.total}</dd>
        </div>
      </dl>
    </Panel>
  );
}
