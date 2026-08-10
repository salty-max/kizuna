import { AlertTriangle, Info } from "lucide-react";

import { POWER_KEYS, POWER_LABELS } from "@/domain/stats";
import {
  CONDITION_LABELS,
  GAUGE_STATS,
  LOWER_IS_BETTER,
  PASSIVE_STAT_LABELS,
  squadShape,
  type SynergyResult,
} from "@/domain/synergy";
import type { ResolvedTeam } from "@/domain/team";
import { BUILD_TYPE_LABELS, RARITY_LABELS, type BuildType, type Element } from "@/domain/types";
import {
  ELEMENT_LABELS,
  ELEMENT_STYLES,
  POSITION_STYLE,
  cn,
  formatNumber,
  formatPercent,
  rarityStyle,
} from "@/lib/ui";

interface Props {
  resolved: ResolvedTeam;
  synergy: SynergyResult;
}

export function SynergyPanel({ resolved, synergy }: Props) {
  const shape = squadShape(resolved);

  return (
    <div className="flex flex-col gap-4">
      <section className="panel overflow-hidden">
        <header className="panel-title flex items-baseline justify-between">
          <h2>Composition</h2>
          <span className="text-xs tnum not-italic">
            {shape.filled}/{shape.capacity} titulaires
          </span>
        </header>

        <div className="flex flex-col gap-2 p-3">
          <Distribution
            label="Raretés"
            entries={shape.rarities.map(({ rarity, count }) => ({
              key: rarity,
              // Hero's variant follows the archetype, which differs per player,
              // so the aggregate row shows the neutral label.
              label: RARITY_LABELS[rarity],
              count,
              className: rarityStyle(rarity, null).badge,
            }))}
            total={shape.filled}
          />
          <Distribution
            label="Éléments"
            entries={shape.elements.map(({ element, count }) => ({
              key: element,
              label: ELEMENT_LABELS[element as Element],
              count,
              className: cn(ELEMENT_STYLES[element as Element].bg, ELEMENT_STYLES[element as Element].text),
            }))}
            total={shape.filled}
          />
          <Distribution
            label="Postes"
            entries={shape.positions.map(({ position, count }) => ({
              key: position,
              label: position,
              count,
              className: POSITION_STYLE,
            }))}
            total={shape.filled}
          />
          {shape.buildTypes.length > 0 && (
            <Distribution
              label="Archétypes"
              entries={shape.buildTypes.map(({ buildType, count }) => ({
                key: buildType,
                label: BUILD_TYPE_LABELS[buildType as BuildType],
                count,
                className: "bg-ink-800 text-ink-300",
              }))}
              total={shape.filled}
            />
          )}

          {shape.violations.map((violation) => (
            <p
              key={violation}
              className="flex items-start gap-1.5 border-l-3 border-[var(--color-bad)] bg-[var(--color-bad)]/12 px-2 py-1.5 text-[11px] text-[var(--color-bad)]"
            >
              <AlertTriangle className="mt-px size-3.5 shrink-0" />
              <span>{violation}</span>
            </p>
          ))}

          {shape.outOfPosition.length > 0 && (
            <p className="flex items-start gap-1.5 border-l-3 border-bolt-500 bg-bolt-500/12 px-2 py-1.5 text-[11px] text-bolt-400">
              <AlertTriangle className="mt-px size-3.5 shrink-0" />
              <span>
                {shape.outOfPosition.length} joueur{shape.outOfPosition.length > 1 ? "s" : ""} hors
                poste :{" "}
                {shape.outOfPosition
                  .map((slot) => `${slot.player?.nickname || slot.player?.name} (${slot.player?.position} → ${slot.expectedPosition})`)
                  .join(", ")}
              </span>
            </p>
          )}
        </div>
      </section>

      <section className="panel overflow-hidden">
        <h2 className="panel-title">Puissance cumulée</h2>
        <div className="p-3">
        <p className="mb-2 text-[11px] text-ink-500">
          Somme des titulaires, passifs garantis appliqués.
        </p>

        <table className="w-full text-sm">
          <tbody>
            {POWER_KEYS.map((key) => {
              const effective = synergy.totals.effective[key];
              const potential = synergy.totals.potential[key];
              return (
                <tr key={key} className="border-t border-ink-850 first:border-0">
                  <th scope="row" className="py-1 text-left text-xs font-normal text-ink-500">
                    {POWER_LABELS[key]}
                  </th>
                  <td className="py-1 text-right font-semibold tnum">{formatNumber(effective)}</td>
                  <td className="w-20 py-1 text-right text-[11px] text-ink-500 tnum">
                    {potential !== effective && `→ ${formatNumber(potential)}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </section>

      <Gauges synergy={synergy} />

      {synergy.unresolved.length > 0 && (
        <section className="panel overflow-hidden">
          <h2 className="panel-title flex items-center gap-1.5">
            <Info className="size-3.5" />
            Non calculable
          </h2>
          <ul className="flex flex-col gap-1.5 p-3 text-[11px]">
            {synergy.unresolved.map((entry, index) => (
              <li key={index} className="text-ink-500">
                <span className="text-ink-300">{entry.description}</span> — {entry.reason}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Gauges({ synergy }: { synergy: SynergyResult }) {
  const active = GAUGE_STATS.map((stat) => ({ stat, modifier: synergy.gauges[stat] })).filter(
    (entry): entry is { stat: (typeof GAUGE_STATS)[number]; modifier: NonNullable<typeof entry.modifier> } =>
      entry.modifier !== undefined &&
      (entry.modifier.guaranteed !== 0 || entry.modifier.conditional !== 0),
  );

  if (active.length === 0) {
    return (
      <section className="panel overflow-hidden">
        <h2 className="panel-title">Jauges</h2>
        <p className="p-3 text-[11px] text-ink-500">
          Aucun passif de jauge actif (tension, brèche, lien, taux de faute, drops…).
        </p>
      </section>
    );
  }

  return (
    <section className="panel overflow-hidden">
      <h2 className="panel-title">Jauges</h2>
      <p className="px-3 pt-3 pb-2 text-[11px] text-ink-500">
        Effets d'équipe sans équivalent par joueur — comptés une seule fois.
      </p>

      <ul className="flex flex-col gap-2 px-3 pb-3">
        {active.map(({ stat, modifier }) => {
          const lowerIsBetter = LOWER_IS_BETTER.has(stat);
          const good = lowerIsBetter ? modifier.guaranteed < 0 : modifier.guaranteed > 0;

          return (
            <li key={stat} className="border-t border-ink-850 pt-2 first:border-0 first:pt-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm">{PASSIVE_STAT_LABELS[stat]}</span>
                <span className="flex items-baseline gap-1.5 tnum">
                  {modifier.guaranteed !== 0 && (
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        good ? "text-[var(--color-good)]" : "text-[var(--color-bad)]",
                      )}
                    >
                      {formatPercent(modifier.guaranteed)}
                    </span>
                  )}
                  {modifier.conditional !== 0 && (
                    <span className="text-[11px] text-amber-400/80">
                      {formatPercent(modifier.conditional)} cond.
                    </span>
                  )}
                </span>
              </div>

              <ul className="mt-0.5 flex flex-col gap-0.5 text-[11px] text-ink-500">
                {modifier.contributions.map((contribution, index) => (
                  <li key={index} className="truncate">
                    {formatPercent(contribution.percent)} · {contribution.description}
                    {contribution.conditions.length > 0 && (
                      <span className="text-amber-400/70">
                        {" "}
                        ({contribution.conditions.map((c) => CONDITION_LABELS[c]).join(", ")})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Distribution({
  label,
  entries,
  total,
}: {
  label: string;
  entries: { key: string; label: string; count: number; className: string }[];
  total: number;
}) {
  if (entries.length === 0) return null;

  return (
    <div>
      <p className="mb-1 text-[11px] text-ink-500">{label}</p>
      <div className="flex flex-wrap gap-1">
        {entries.map((entry) => (
          <span
            key={entry.key}
            className={cn("rounded border border-transparent px-1.5 py-0.5 text-[11px]", entry.className)}
            title={`${entry.count}/${total}`}
          >
            {entry.label} <span className="font-semibold tnum">{entry.count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
