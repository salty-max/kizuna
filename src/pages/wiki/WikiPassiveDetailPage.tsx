import { Link, useParams } from "react-router";

import { Callout, DataList, DataRow, Panel, PanelHint } from "@/components/ui";
import { useDataset } from "@/data/useDataset";
import type { Passive } from "@/domain/types";
import { passiveDisplayDescription, useI18n } from "@/i18n";
import { formatNumber } from "@/lib/ui";

export function WikiPassiveDetailPage() {
  const { id: rawId } = useParams();
  const id = rawId ? decodeURIComponent(rawId) : "";
  const { t, locale } = useI18n();
  const dataset = useDataset();
  const passive = dataset.passives.find((x) => x.id === id) ?? null;

  if (!passive) {
    return (
      <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">
        <Panel title={t("wiki.passives")}>
          <Callout tone="warn">{t("wiki.notFound")}</Callout>
          <Link to="/wiki/passives" className="mt-3 inline-block text-sm text-bolt-400">
            {t("wiki.backToList")}
          </Link>
        </Panel>
      </div>
    );
  }

  return (
    <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <Link to="/wiki" className="text-ink-500 no-underline hover:text-bolt-400">
          {t("wiki.title")}
        </Link>
        <span className="text-ink-700">/</span>
        <Link to="/wiki/passives" className="text-ink-500 no-underline hover:text-bolt-400">
          {t("wiki.passives")}
        </Link>
        <span className="text-ink-700">/</span>
        <span className="truncate text-ink-300">#{passive.number}</span>
      </div>

      <Panel
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-display text-ink-500 tnum">#{passive.number}</span>
            <span className="rounded border border-ink-700 px-1.5 py-0.5 text-xs font-normal tracking-normal text-ink-400 uppercase not-italic">
              {t(`wiki.passiveSource.${passive.source}`)}
            </span>
          </span>
        }
        bodyClassName="flex flex-col gap-4"
      >
        <p className="text-sm whitespace-pre-line text-ink-100">
          {passiveDisplayDescription(passive, locale)}
        </p>

        <PanelHint>{t("wiki.passivesEffectsGap")}</PanelHint>

        <DataList>
          <DataRow
            label={t("wiki.field.id")}
            value={<code className="text-xs">{passive.id}</code>}
          />
          <DataRow
            label={t("wiki.field.source")}
            value={t(`wiki.passiveSource.${passive.source}`)}
          />
          <DataRow
            label={t("wiki.field.number")}
            value={<span className="tnum">{formatNumber(passive.number, locale)}</span>}
          />
          <DataRow label={t("wiki.field.value")} value={formatValueRange(passive, locale)} />
        </DataList>
      </Panel>
    </div>
  );
}

function formatValueRange(passive: Passive, locale: "fr" | "en" | "ja"): string {
  const weak = formatBound(passive.weakValue, locale);
  const strong = formatBound(passive.strongValue, locale);
  if (passive.weakValue === passive.strongValue) return `${strong} %`;
  return `${weak} % – ${strong} %`;
}

function formatBound(value: number, locale: "fr" | "en" | "ja"): string {
  const sep = locale === "fr" ? "," : ".";
  return String(value).replace(".", sep);
}
