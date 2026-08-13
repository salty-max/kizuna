import { Link, useParams } from "react-router";

import { Callout, DataList, DataRow, Panel } from "@/components/ui";
import { useDataset } from "@/data/useDataset";
import type { Passive, PassiveEffect } from "@/domain/types";
import { passiveDisplayDescription, useI18n } from "@/i18n";
import {
  conditionLabel,
  directionLabel,
  passiveStatLabel,
  scopeLabel,
  statLabel,
} from "@/i18n/labels";
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

  const hasEffects = passive.effects.length > 0;

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
            <span
              className={
                hasEffects
                  ? "rounded border border-bolt-500/40 px-1.5 py-0.5 text-xs font-normal tracking-normal text-bolt-300 uppercase not-italic"
                  : "rounded border border-ink-700 px-1.5 py-0.5 text-xs font-normal tracking-normal text-ink-500 uppercase not-italic"
              }
            >
              {hasEffects ? t("wiki.effectsParsed") : t("wiki.effectsUnparsed")}
            </span>
          </span>
        }
        bodyClassName="flex flex-col gap-4"
      >
        <p className="text-sm whitespace-pre-line text-ink-100">
          {passiveDisplayDescription(passive, locale)}
        </p>
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

        <div>
          <h3 className="mb-2 font-display text-xs font-bold tracking-wide text-ink-400 uppercase italic">
            {t("wiki.effects")}
          </h3>
          {hasEffects ? (
            <ul className="flex flex-col gap-1.5">
              {passive.effects.map((effect, index) => (
                <li
                  key={index}
                  className="border-2 border-ink-800 bg-ink-900/40 px-2.5 py-2 text-sm text-ink-100"
                >
                  <EffectLine effect={effect} />
                </li>
              ))}
            </ul>
          ) : (
            <Callout tone="info">{t("wiki.effectsNone")}</Callout>
          )}
        </div>
      </Panel>
    </div>
  );
}

function EffectLine({ effect }: { effect: PassiveEffect }) {
  const { t } = useI18n();
  const statText =
    effect.mode === "flat"
      ? `${directionLabel(t, effect.direction)} ${statLabel(t, effect.baseStat)} (flat)`
      : `${directionLabel(t, effect.direction)} ${passiveStatLabel(t, effect.stat)}`;
  const parts = [scopeLabel(t, effect.scope), statText];
  if (effect.conditions.length > 0) {
    parts.push(effect.conditions.map((c) => conditionLabel(t, c)).join(" · "));
  }
  return <span>{parts.join(" · ")}</span>;
}

function isFlatOnly(passive: Passive): boolean {
  return passive.effects.length > 0 && passive.effects.every((e) => e.mode === "flat");
}

function formatValueRange(passive: Passive, locale: "fr" | "en" | "ja"): string {
  const weak = formatBound(passive.weakValue, locale);
  const strong = formatBound(passive.strongValue, locale);
  const unit = isFlatOnly(passive) ? "" : " %";
  if (passive.weakValue === passive.strongValue) return `${strong}${unit}`;
  return `${weak}${unit} – ${strong}${unit}`;
}

function formatBound(value: number, locale: "fr" | "en" | "ja"): string {
  const sep = locale === "fr" ? "," : ".";
  return String(value).replace(".", sep);
}
