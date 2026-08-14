import { AlertTriangle, ShieldCheck, Users } from "lucide-react";

import { POWER_KEYS } from "@/domain/stats";
import { squadShape, type SynergyResult } from "@/domain/synergy";
import { rarityBudget, type ResolvedTeam } from "@/domain/team";
import { playerDisplayName, useI18n } from "@/i18n";
import { powerLabel, ruleNoticeLabel, violationLabel } from "@/i18n/labels";
import { formatNumber } from "@/lib/ui";
import { Callout, Panel } from "../ui";

/** Dense, match-day reading: legality and power stay visible together. */
export function TeamOverviewSection({
  resolved,
  synergy,
}: {
  resolved: ResolvedTeam;
  synergy: SynergyResult;
}) {
  const { t, locale, showOriginalNames } = useI18n();
  const shape = squadShape(resolved);
  const budget = rarityBudget(resolved.team);
  const issueCount = shape.violations.length + shape.outOfPosition.length;

  return (
    <Panel title={t("synergy.composition")} bodyClassName="flex flex-col gap-2.5">
      <div className="grid grid-cols-3 gap-1.5">
        <OverviewMetric
          icon={<Users className="size-3.5" />}
          value={`${shape.filled}/${shape.capacity}`}
          label={t("workspace.starters")}
        />
        <OverviewMetric
          icon={<AlertTriangle className="size-3.5" />}
          value={shape.outOfPosition.length}
          label={t("optimizer.fallbackMetric")}
          warning={shape.outOfPosition.length > 0}
        />
        <OverviewMetric
          icon={<ShieldCheck className="size-3.5" />}
          value={issueCount}
          label={t("workspace.alerts")}
          warning={issueCount > 0}
        />
      </div>

      <div className="flex flex-wrap gap-1.5" aria-label={t("app.rarityBudget")}>
        <span className="cockpit-budget">
          {t("app.heroBudget", { n: budget.heroes, max: budget.maxHeroes })}
        </span>
        <span className="cockpit-budget">
          {t("app.basaraBudget", { n: budget.basaras, max: budget.maxBasaras })}
        </span>
      </div>

      <div>
        <p className="label-display mb-1">{t("synergy.totalPower")}</p>
        <div className="grid grid-cols-2 gap-px border border-ink-800 bg-ink-800">
          {POWER_KEYS.map((key) => (
            <div
              key={key}
              className="flex min-w-0 items-baseline justify-between gap-2 bg-ink-900/95 px-2 py-1.5"
            >
              <span className="truncate text-[10px] tracking-wide text-ink-500 uppercase">
                {powerLabel(t, key)}
              </span>
              <strong className="shrink-0 text-xs text-ink-200 tnum">
                {formatNumber(synergy.totals.effective[key], locale)}
              </strong>
            </div>
          ))}
        </div>
      </div>

      {shape.violations.map((violation) => (
        <Callout key={violation.code} tone="bad">
          {violationLabel(t, violation)}
        </Callout>
      ))}
      {shape.notices.map((notice) => (
        <Callout key={notice.code} tone="info">
          {ruleNoticeLabel(t, notice)}
        </Callout>
      ))}
      {shape.outOfPosition.length > 0 && (
        <Callout tone="warn">
          {t("synergy.outOfPosition", {
            n: shape.outOfPosition.length,
            list: shape.outOfPosition
              .map((slot) =>
                t("synergy.outOfPositionItem", {
                  name: playerDisplayName(slot.player, showOriginalNames, locale) || "?",
                  from: slot.player?.position ?? "?",
                  to: slot.expectedPosition ?? "?",
                }),
              )
              .join(", "),
          })}
        </Callout>
      )}
    </Panel>
  );
}

function OverviewMetric({
  icon,
  value,
  label,
  warning = false,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  warning?: boolean;
}) {
  return (
    <div className="border border-ink-800 bg-ink-950/55 px-1.5 py-1.5 text-center">
      <p
        className={`flex items-center justify-center gap-1 font-display text-lg font-black tnum ${warning ? "text-bolt-400" : "text-ink-100"}`}
      >
        {icon}
        {value}
      </p>
      <p className="truncate text-[9px] tracking-wide text-ink-500 uppercase">{label}</p>
    </div>
  );
}
