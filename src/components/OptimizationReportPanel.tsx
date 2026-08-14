import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";

import type { OptimizationReason, OptimizationReport } from "@/domain/fillBest";
import type { Dataset } from "@/domain/types";
import { playerDisplayName, useI18n } from "@/i18n";
import { Callout, Chip, IconButton, Panel, PanelMeta } from "./ui";

interface Props {
  report: OptimizationReport;
  dataset: Dataset;
  onDismiss: () => void;
}

export function OptimizationReportPanel({ report, dataset, onDismiss }: Props) {
  const { t, locale, showOriginalNames } = useI18n();
  const playersById = new Map(dataset.players.map((player) => [player.id, player]));
  const countReason = (reason: OptimizationReason) =>
    report.decisions.filter((decision) => decision.reasons.includes(reason)).length;
  const natural = countReason("naturalPosition") + countReason("alternatePosition");
  const teamBuild = countReason("teamBuild");
  const synergy = countReason("equippedSynergy");
  const fallback = countReason("fallbackPosition");

  return (
    <Panel
      title={t("optimizer.title")}
      action={
        <span className="flex items-center gap-2">
          <PanelMeta>{t("optimizer.added", { n: report.decisions.length })}</PanelMeta>
          <IconButton className="size-7" onClick={onDismiss} aria-label={t("optimizer.dismiss")}>
            <X className="size-3.5" />
          </IconButton>
        </span>
      }
      bodyClassName="flex flex-col gap-2"
    >
      <p className="text-sm font-medium leading-relaxed text-ink-200">
        {t(report.preservesExisting ? "optimizer.summary" : "optimizer.rebuiltSummary", {
          n: report.decisions.length,
        })}
      </p>

      <div className="grid grid-cols-3 gap-1.5" aria-label={t("optimizer.keyFigures")}>
        <Metric value={report.decisions.length} label={t("optimizer.filledMetric")} />
        <Metric value={natural} label={t("optimizer.inPositionMetric")} tone="good" />
        <Metric
          value={fallback}
          label={t("optimizer.fallbackMetric")}
          tone={fallback ? "warn" : "muted"}
        />
      </div>

      {fallback > 0 ? (
        <Callout tone="warn">{t("optimizer.fallbackWarning", { n: fallback })}</Callout>
      ) : (
        <p className="flex items-center gap-1.5 text-xs text-[var(--color-good)]">
          <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
          {t("optimizer.noFallback")}
        </p>
      )}

      {(teamBuild > 0 || synergy > 0) && (
        <div>
          <p className="mb-1 text-[10px] font-bold tracking-wide text-ink-500 uppercase">
            {t("optimizer.appliedPriorities")}
          </p>
          <div className="flex flex-wrap gap-1">
            {teamBuild > 0 && <Chip>{t("optimizer.teamBuild", { n: teamBuild })}</Chip>}
            {synergy > 0 && <Chip>{t("optimizer.synergy", { n: synergy })}</Chip>}
          </div>
        </div>
      )}

      <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-500">
        <Info className="mt-px size-3.5 shrink-0" aria-hidden />
        {t(report.preservesExisting ? "optimizer.emptyOnly" : "optimizer.rebuiltInfo")}
      </p>

      <details className="border-t border-ink-800 pt-2">
        <summary className="cursor-pointer font-display text-xs font-bold tracking-wide text-ink-300 uppercase italic">
          {t("optimizer.details", { n: report.decisions.length })}
        </summary>
        <div className="mt-2 border-l-2 border-bolt-500 pl-2 text-[11px] leading-relaxed text-ink-500">
          <p>{t("optimizer.policy")}</p>
          <p className="mt-1">
            {t(report.preservesExisting ? "optimizer.safeguards" : "optimizer.rebuiltSafeguards")}
          </p>
        </div>
        <ul className="mt-2 flex flex-col gap-1.5">
          {report.decisions.map((decision) => {
            const player = playersById.get(decision.playerId);
            const name =
              playerDisplayName(player ?? null, showOriginalNames, locale) ||
              `#${decision.playerId}`;
            const slot = decision.expectedPosition
              ? decision.expectedPosition
              : t(`optimizer.slots.${decision.slotKind}`);
            return (
              <li key={decision.slotId} className="border-t border-ink-850 pt-1.5 first:border-0">
                <p className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="truncate font-medium text-ink-200">{name}</span>
                  <span className="shrink-0 text-ink-500">{slot}</span>
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-ink-500">
                  {decision.reasons.map((reason) => t(`optimizer.reasons.${reason}`)).join(" · ")}
                </p>
              </li>
            );
          })}
        </ul>
      </details>
    </Panel>
  );
}

function Metric({
  value,
  label,
  tone = "default",
}: {
  value: number;
  label: string;
  tone?: "default" | "good" | "warn" | "muted";
}) {
  const icon =
    tone === "warn" ? (
      <TriangleAlert className="size-3.5" aria-hidden />
    ) : tone === "good" ? (
      <CheckCircle2 className="size-3.5" aria-hidden />
    ) : null;
  const color =
    tone === "warn"
      ? "text-bolt-400"
      : tone === "good"
        ? "text-[var(--color-good)]"
        : tone === "muted"
          ? "text-ink-500"
          : "text-ink-100";

  return (
    <div className="border border-ink-800 bg-ink-900/60 px-2 py-1.5 text-center">
      <p
        className={`flex items-center justify-center gap-1 font-display text-lg font-black tnum ${color}`}
      >
        {icon}
        {value}
      </p>
      <p className="text-[9px] leading-tight tracking-wide text-ink-500 uppercase">{label}</p>
    </div>
  );
}
