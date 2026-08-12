import { Link, useParams } from "react-router";

import { Callout, DataList, DataRow, Panel } from "@/components/ui";
import { useDataset } from "@/data/useDataset";
import { imageUrl } from "@/data/load";
import { STAT_KEYS } from "@/domain/stats";
import { equipmentDisplayDescription, equipmentDisplayName, useI18n } from "@/i18n";
import { equipmentSlotLabel, statLabel } from "@/i18n/labels";
import { formatNumber } from "@/lib/ui";

export function WikiEquipmentDetailPage() {
  const { id: rawId } = useParams();
  const id = rawId ? decodeURIComponent(rawId) : "";
  const { t, locale } = useI18n();
  const dataset = useDataset();
  const item = dataset.equipment.find((e) => e.id === id) ?? null;

  if (!item) {
    return (
      <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">
        <Panel title={t("wiki.equipment")}>
          <Callout tone="warn">{t("wiki.notFound")}</Callout>
          <Link to="/wiki/equipment" className="mt-3 inline-block text-sm text-bolt-400">
            {t("wiki.backToList")}
          </Link>
        </Panel>
      </div>
    );
  }

  const name = equipmentDisplayName(item, locale);
  const description = equipmentDisplayDescription(item, locale);

  return (
    <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <Link to="/wiki" className="text-ink-500 no-underline hover:text-bolt-400">
          {t("wiki.title")}
        </Link>
        <span className="text-ink-700">/</span>
        <Link to="/wiki/equipment" className="text-ink-500 no-underline hover:text-bolt-400">
          {t("wiki.equipment")}
        </Link>
        <span className="text-ink-700">/</span>
        <span className="truncate text-ink-300">{name}</span>
      </div>

      <Panel title={name} bodyClassName="flex flex-col gap-4">
        <div className="flex items-start gap-4">
          {item.image ? (
            <img
              src={imageUrl(dataset.imageBase, item.image, 128)}
              alt=""
              width={72}
              height={72}
              className="size-[72px] shrink-0 border-2 border-ink-700 bg-ink-950 object-contain"
            />
          ) : (
            <span className="flex size-[72px] shrink-0 items-center justify-center border-2 border-ink-800 bg-ink-950 text-ink-600">
              —
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-display text-xs font-bold tracking-wide text-ink-500 uppercase italic">
              {equipmentSlotLabel(t, item.slot)}
            </p>
            <p className="mt-1 font-display text-2xl font-bold tnum text-bolt-400">
              +{formatNumber(item.total, locale)}
            </p>
            {description && (
              <p className="mt-2 text-sm whitespace-pre-line text-ink-300">{description}</p>
            )}
          </div>
        </div>

        <DataList>
          <DataRow label={t("wiki.field.id")} value={<code className="text-xs">{item.id}</code>} />
          {item.shop && <DataRow label={t("wiki.field.shop")} value={item.shop} />}
          {STAT_KEYS.map((key) => {
            const value = item.stats[key] ?? 0;
            if (value === 0) return null;
            return (
              <DataRow
                key={key}
                label={statLabel(t, key)}
                value={`+${formatNumber(value, locale)}`}
              />
            );
          })}
        </DataList>
      </Panel>
    </div>
  );
}
