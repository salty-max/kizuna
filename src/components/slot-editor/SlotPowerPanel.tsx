import { useMemo } from "react";

import { POWER_KEYS, type PowerKey } from "@/domain/stats";
import type { Modifier, SynergyResult } from "@/domain/synergy";
import type { ResolvedSlot } from "@/domain/team";
import type { Passive } from "@/domain/types";
import { contributionPlayerName, passiveDisplayDescription, useI18n } from "@/i18n";
import { conditionLabel, powerFormula, powerLabel, scopeNoteLabel } from "@/i18n/labels";
import { cn, formatPercent } from "@/lib/ui";
import { Callout, Panel } from "../ui";

interface Props {
  slot: ResolvedSlot;
  synergy: SynergyResult;
  passives: Passive[];
}

export function SlotPowerPanel({ slot, synergy, passives }: Props) {
  const { t, locale } = useI18n();
  const modifiers = synergy.power.get(slot.slotId);
  const effective = synergy.effective.get(slot.slotId);
  const potential = synergy.potential.get(slot.slotId);

  if (!modifiers || !effective || !potential) return null;

  return (
    <Panel as="h3" title={t("editor.power")}>
      <table className="w-full text-sm">
        <tbody>
          {POWER_KEYS.map((key) => {
            const modifier = modifiers[key];
            const hasCeiling = potential[key] !== effective[key];
            return (
              <tr key={key} className="border-t border-ink-850 first:border-0">
                <th
                  scope="row"
                  title={powerFormula(t, key)}
                  className="py-1 text-left text-xs font-normal text-ink-500 underline decoration-dotted underline-offset-2"
                >
                  {powerLabel(t, key)}
                </th>
                <td className="py-1 text-right text-xs text-ink-500 tnum">{slot.power[key]}</td>
                <td className="py-1 text-right font-semibold tnum">
                  {effective[key]}
                  {hasCeiling && (
                    <span className="ml-1 text-[11px] font-normal text-ink-500">
                      → {potential[key]}
                    </span>
                  )}
                </td>
                <td className="w-16 py-1 text-right text-[11px] tnum">
                  {modifier.guaranteed !== 0 && (
                    <span
                      className={
                        modifier.guaranteed > 0
                          ? "text-[var(--color-good)]"
                          : "text-[var(--color-bad)]"
                      }
                    >
                      {formatPercent(modifier.guaranteed, locale)}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <Contributions modifiers={modifiers} passives={passives} />
      <PowerCapNotices modifiers={modifiers} />
    </Panel>
  );
}

function Contributions({
  modifiers,
  passives,
}: {
  modifiers: Record<PowerKey, Modifier>;
  passives: Passive[];
}) {
  const { t, locale, showOriginalNames } = useI18n();
  const passivesById = useMemo(
    () => new Map(passives.map((passive) => [passive.id, passive])),
    [passives],
  );
  const contributions = new Map<
    string,
    { description: string; from: string | null; percent: number; conditions: string[] }
  >();

  for (const modifier of Object.values(modifiers)) {
    for (const contribution of modifier.contributions) {
      const key = `${contribution.passiveId}:${contribution.fromSlotId}`;
      if (contributions.has(key)) continue;
      const passive = passivesById.get(contribution.passiveId);
      contributions.set(key, {
        description: passive
          ? passiveDisplayDescription(passive, locale)
          : contribution.description,
        from: contributionPlayerName(contribution, showOriginalNames),
        percent: contribution.percent,
        conditions: [
          ...contribution.conditions.map((condition) => conditionLabel(t, condition)),
          ...(contribution.note ? [scopeNoteLabel(t, contribution.note)] : []),
        ],
      });
    }
  }

  if (contributions.size === 0) return null;

  return (
    <ul className="mt-2 flex flex-col gap-1 border-t border-ink-850 pt-2 text-[11px]">
      {[...contributions.values()].map((entry, index) => (
        <li key={index} className="flex items-baseline gap-2">
          <span
            className={cn(
              "shrink-0 tnum font-semibold",
              entry.percent > 0 ? "text-[var(--color-good)]" : "text-[var(--color-bad)]",
            )}
          >
            {formatPercent(entry.percent, locale)}
          </span>
          <span className="min-w-0 flex-1 text-ink-300">
            {entry.description}
            {entry.from && <span className="text-ink-500"> — {entry.from}</span>}
            {entry.conditions.length > 0 && (
              <span className="text-amber-400/70"> ({entry.conditions.join(", ")})</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

function PowerCapNotices({ modifiers }: { modifiers: Record<PowerKey, Modifier> }) {
  const { t, locale } = useI18n();
  const caps = new Map<string, Modifier["caps"][number]>();

  for (const modifier of Object.values(modifiers)) {
    for (const cap of modifier.caps) caps.set(`${cap.id}:${cap.certainty}`, cap);
  }

  if (caps.size === 0) return null;

  return (
    <div className="mt-2 flex flex-col gap-1">
      {[...caps.values()].map((cap) => (
        <Callout key={`${cap.id}:${cap.certainty}`} tone="warn">
          {t("synergy.capApplied", {
            raw: formatPercent(cap.raw, locale),
            applied: formatPercent(cap.applied, locale),
          })}
        </Callout>
      ))}
    </div>
  );
}
