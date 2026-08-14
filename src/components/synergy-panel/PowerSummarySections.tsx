import { useMemo } from "react";

import { POWER_KEYS } from "@/domain/stats";
import { GAUGE_STATS, LOWER_IS_BETTER, type SynergyResult } from "@/domain/synergy";
import type { Passive } from "@/domain/types";
import { passiveDisplayDescription, useI18n } from "@/i18n";
import {
  conditionLabel,
  passiveStatLabel,
  powerLabel,
  scopeNoteLabel,
  unresolvedReasonLabel,
} from "@/i18n/labels";
import { cn, formatNumber, formatPercent } from "@/lib/ui";
import { Callout, DataList, DataRow, Panel } from "../ui";

export function TotalPowerSection({ synergy }: { synergy: SynergyResult }) {
  const { t, locale } = useI18n();

  return (
    <Panel title={t("synergy.totalPower")}>
      <DataList>
        {POWER_KEYS.map((key) => {
          const effective = synergy.totals.effective[key];
          const potential = synergy.totals.potential[key];
          return (
            <DataRow
              key={key}
              label={powerLabel(t, key)}
              value={formatNumber(effective, locale)}
              extra={potential !== effective && `→ ${formatNumber(potential, locale)}`}
            />
          );
        })}
      </DataList>
    </Panel>
  );
}

export function GaugesSection({
  synergy,
  passives,
}: {
  synergy: SynergyResult;
  passives: Passive[];
}) {
  const { t, locale } = useI18n();
  const passivesById = useMemo(
    () => new Map(passives.map((passive) => [passive.id, passive])),
    [passives],
  );
  const active = GAUGE_STATS.map((stat) => {
    const modifier = synergy.gauges[stat];
    if (!modifier || (modifier.guaranteed === 0 && modifier.conditional === 0)) return null;
    return { stat, modifier };
  }).filter((row): row is NonNullable<typeof row> => row !== null);

  if (active.length === 0) return null;

  return (
    <Panel title={t("synergy.gauges")}>
      <ul className="flex flex-col gap-2">
        {active.map(({ stat, modifier }) => {
          const lowerIsBetter = LOWER_IS_BETTER.has(stat);
          const good = lowerIsBetter ? modifier.guaranteed < 0 : modifier.guaranteed > 0;

          return (
            <li key={stat} className="border-t border-ink-850 pt-2 first:border-0 first:pt-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm">{passiveStatLabel(t, stat)}</span>
                <span className="flex items-baseline gap-1.5 tnum">
                  {modifier.guaranteed !== 0 && (
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        good ? "text-[var(--color-good)]" : "text-[var(--color-bad)]",
                      )}
                    >
                      {formatPercent(modifier.guaranteed, locale)}
                    </span>
                  )}
                  {modifier.conditional !== 0 && (
                    <span className="text-[11px] text-amber-400/80">
                      {formatPercent(modifier.conditional, locale)} {t("editor.conditional")}
                    </span>
                  )}
                </span>
              </div>

              <ul className="mt-0.5 flex flex-col gap-0.5 text-[11px] text-ink-500">
                {modifier.contributions.map((contribution, index) => {
                  const passive = passivesById.get(contribution.passiveId);
                  const text = passive
                    ? passiveDisplayDescription(passive, locale)
                    : contribution.description;
                  return (
                    <li key={index} className="truncate">
                      {formatPercent(contribution.percent, locale)} · {text}
                      {(contribution.conditions.length > 0 || contribution.note) && (
                        <span className="text-amber-400/70">
                          {" "}
                          (
                          {[
                            ...contribution.conditions.map((condition) =>
                              conditionLabel(t, condition),
                            ),
                            ...(contribution.note ? [scopeNoteLabel(t, contribution.note)] : []),
                          ].join(", ")}
                          )
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
              {modifier.caps.map((cap) => (
                <p
                  key={`${cap.id}:${cap.certainty}`}
                  className="mt-1 text-[11px] text-amber-400/90"
                >
                  {t("synergy.capApplied", {
                    raw: formatPercent(cap.raw, locale),
                    applied: formatPercent(cap.applied, locale),
                  })}
                </p>
              ))}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export function UnresolvedSection({
  synergy,
  passives,
}: {
  synergy: SynergyResult;
  passives: Passive[];
}) {
  const { t, locale } = useI18n();
  const passivesById = useMemo(
    () => new Map(passives.map((passive) => [passive.id, passive])),
    [passives],
  );

  if (synergy.unresolved.length === 0) return null;

  return (
    <Panel title={t("synergy.unresolved")} bodyClassName="flex flex-col gap-1.5">
      {synergy.unresolved.map((item, index) => {
        const passive = passivesById.get(item.passiveId);
        const text = passive ? passiveDisplayDescription(passive, locale) : item.description;
        return (
          <Callout key={index} tone="info">
            {text} — {unresolvedReasonLabel(t, item.reason)}
          </Callout>
        );
      })}
    </Panel>
  );
}
