import { detectBonds } from "@/domain/bonds";
import { POWER_KEYS } from "@/domain/stats";
import { GAUGE_STATS, LOWER_IS_BETTER, squadShape, type SynergyResult } from "@/domain/synergy";
import type { ResolvedTeam } from "@/domain/team";
import {
  MAX_TEAM_TACTICS,
  type BuildType,
  type Dataset,
  type Element,
  type Position,
  type Tactic,
} from "@/domain/types";
import {
  bondDisplayDescription,
  bondDisplayName,
  passiveDisplayDescription,
  playerDisplayName,
  tacticDisplayDescription,
  tacticDisplayName,
  useI18n,
} from "@/i18n";
import {
  buildTypeLabel,
  conditionLabel,
  elementLabel,
  passiveStatLabel,
  powerLabel,
  rarityLabelKey,
  scopeNoteLabel,
  unresolvedReasonLabel,
  violationLabel,
} from "@/i18n/labels";
import { ELEMENT_STYLES, cn, formatNumber, formatPercent, rarityStyle } from "@/lib/ui";
import { useMemo } from "react";
import { ElementBadge, PositionBadge, StyleBadge, TacticIcon } from "./GameIcon";
import { Callout, Chip, DataList, DataRow, Panel, PanelHint, PanelMeta, Select } from "./ui";

interface Props {
  resolved: ResolvedTeam;
  synergy: SynergyResult;
  dataset: Dataset;
  tacticIds: string[];
  onTacticsChange: (tacticIds: string[]) => void;
}

export function SynergyPanel({ resolved, synergy, dataset, tacticIds, onTacticsChange }: Props) {
  const { t, locale, showOriginalNames } = useI18n();
  const shape = squadShape(resolved);
  const bonds = useMemo(
    () => detectBonds(resolved, dataset.synergies),
    [resolved, dataset.synergies],
  );
  const activeBonds = bonds.filter((b) => b.status === "active");
  const partialBonds = bonds.filter((b) => b.status === "partial").slice(0, 8);

  return (
    <div className="flex flex-col gap-4">
      <TacticsSection tactics={dataset.tactics} tacticIds={tacticIds} onChange={onTacticsChange} />

      <Panel
        title={t("synergy.bonds")}
        action={
          activeBonds.length > 0 ? (
            <PanelMeta>
              {t("synergy.bondsOf", {
                present: activeBonds.length,
                total: dataset.synergies.length,
              })}
            </PanelMeta>
          ) : undefined
        }
        bodyClassName="flex flex-col gap-2"
      >
        <PanelHint>{t("synergy.bondsHint")}</PanelHint>

        {activeBonds.length === 0 && partialBonds.length === 0 ? (
          <p className="text-xs text-ink-500">{t("synergy.bondsNone")}</p>
        ) : (
          <>
            {activeBonds.length > 0 && (
              <BondGroup label={t("synergy.bondsActive")} tone="good">
                {activeBonds.map((bond) => (
                  <BondRow
                    key={bond.synergy.id}
                    name={bondDisplayName(bond.synergy, locale)}
                    description={bondDisplayDescription(bond.synergy, locale)}
                    members={bond.synergy.memberNames}
                    present={bond.present.length}
                    total={bond.synergy.members.length}
                    active
                  />
                ))}
              </BondGroup>
            )}
            {partialBonds.length > 0 && (
              <BondGroup label={t("synergy.bondsPartial")} tone="warn">
                {partialBonds.map((bond) => {
                  const missingNames = bond.missing.map((id) => {
                    const idx = bond.synergy.members.indexOf(id);
                    return bond.synergy.memberNames[idx] ?? `#${id}`;
                  });
                  return (
                    <BondRow
                      key={bond.synergy.id}
                      name={bondDisplayName(bond.synergy, locale)}
                      description={bondDisplayDescription(bond.synergy, locale)}
                      members={bond.synergy.memberNames}
                      present={bond.present.length}
                      total={bond.synergy.members.length}
                      missingLabel={t("synergy.bondsMissing", {
                        list: missingNames.join(", "),
                      })}
                    />
                  );
                })}
              </BondGroup>
            )}
          </>
        )}
      </Panel>

      <Panel
        title={t("synergy.composition")}
        action={
          <PanelMeta>
            {t("synergy.starters", { filled: shape.filled, capacity: shape.capacity })}
          </PanelMeta>
        }
        bodyClassName="flex flex-col gap-2"
      >
        <Distribution
          label={t("synergy.rarities")}
          entries={shape.rarities.map(({ rarity, count }) => ({
            key: rarity,
            label: rarityLabelKey(t, rarity),
            count,
            className: rarityStyle(rarity, null).badge,
          }))}
          total={shape.filled}
        />
        <Distribution
          label={t("synergy.elements")}
          entries={shape.elements.map(({ element, count }) => ({
            key: element,
            label: elementLabel(t, element as Element),
            count,
            className: cn(
              ELEMENT_STYLES[element as Element].bg,
              ELEMENT_STYLES[element as Element].text,
            ),
            icon: <ElementBadge element={element as Element} variant="icon" size={14} />,
          }))}
          total={shape.filled}
        />
        <Distribution
          label={t("synergy.positions")}
          entries={shape.positions.map(({ position, count }) => ({
            key: position,
            label: position,
            count,
            className: "bg-ink-850 text-ink-200",
            icon: <PositionBadge position={position as Position} variant="silhouette" size={14} />,
          }))}
          total={shape.filled}
        />
        {shape.buildTypes.length > 0 && (
          <Distribution
            label={t("synergy.archetypes")}
            entries={shape.buildTypes.map(({ buildType, count }) => ({
              key: buildType,
              label: buildTypeLabel(t, buildType as BuildType),
              count,
              className: "bg-ink-800 text-ink-300",
              icon: <StyleBadge buildType={buildType as BuildType} variant="icon" size={14} />,
            }))}
            total={shape.filled}
          />
        )}

        {shape.violations.map((violation) => (
          <Callout key={violation.code} tone="bad">
            {violationLabel(t, violation)}
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

      <Panel title={t("synergy.totalPower")}>
        <PanelHint>{t("synergy.totalPowerHint")}</PanelHint>
        <Callout tone="info" className="mb-2">
          {t("synergy.passivesEffectsGap")}
        </Callout>

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

      <GaugesSection synergy={synergy} passives={dataset.passives} />

      {synergy.unresolved.length > 0 && (
        <Panel title={t("synergy.unresolved")} bodyClassName="flex flex-col gap-1.5">
          {synergy.unresolved.map((item, index) => {
            const passive = dataset.passives.find((p) => p.id === item.passiveId);
            const text = passive ? passiveDisplayDescription(passive, locale) : item.description;
            return (
              <Callout key={index} tone="info">
                {text} — {unresolvedReasonLabel(t, item.reason)}
              </Callout>
            );
          })}
        </Panel>
      )}
    </div>
  );
}

function TacticsSection({
  tactics,
  tacticIds,
  onChange,
}: {
  tactics: Tactic[];
  tacticIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const { t, locale } = useI18n();
  const byId = useMemo(() => new Map(tactics.map((x) => [x.id, x])), [tactics]);

  const slots = Array.from({ length: MAX_TEAM_TACTICS }, (_, i) => tacticIds[i] ?? "");

  const setSlot = (index: number, id: string) => {
    const next = [...slots];
    next[index] = id;
    // Compact: keep order of filled slots only, hard-cap at the game limit.
    onChange(next.filter(Boolean).slice(0, MAX_TEAM_TACTICS));
  };

  return (
    <Panel title={t("app.tactics")} bodyClassName="flex flex-col gap-2">
      {slots.map((id, index) => {
        const taken = new Set(slots.filter((x, i) => x && i !== index));
        return (
          <div key={index} className="flex flex-col gap-0.5">
            <span className="label-display text-ink-500">
              {t("app.tacticSlot", { n: index + 1 })}
            </span>
            <Select
              value={id}
              searchable
              searchPlaceholder={t("editor.search")}
              emptyLabel={t("editor.searchEmpty")}
              placeholder={t("app.tacticEmpty")}
              aria-label={t("app.tacticSlot", { n: index + 1 })}
              options={[
                { value: "", label: t("app.tacticEmpty") },
                ...tactics.map((tactic) => {
                  const name = tacticDisplayName(tactic, locale);
                  return {
                    value: tactic.id,
                    label: `${name} (${t("app.tacticTp", { n: tactic.tpCost })})`,
                    disabled: taken.has(tactic.id),
                    render: (
                      <span className="flex items-center gap-1.5">
                        <TacticIcon tacticId={tactic.id} size={18} title={name} />
                        <span className="min-w-0 flex-1 truncate">{name}</span>
                        <span className="shrink-0 text-ink-500 tnum">
                          {t("app.tacticTp", { n: tactic.tpCost })}
                        </span>
                      </span>
                    ),
                  };
                }),
              ]}
              onChange={(next) => setSlot(index, next)}
            />
            {id && byId.get(id) && tacticDisplayDescription(byId.get(id)!, locale) && (
              <p className="line-clamp-2 text-[11px] text-ink-500 whitespace-pre-line">
                {tacticDisplayDescription(byId.get(id)!, locale)}
              </p>
            )}
          </div>
        );
      })}
    </Panel>
  );
}

function BondGroup({
  label,
  tone,
  children,
}: {
  label: string;
  tone: "good" | "warn";
  children: React.ReactNode;
}) {
  return (
    <div>
      <p
        className={cn(
          "label-display mb-1",
          tone === "good" ? "text-[var(--color-good)]" : "text-amber-400/90",
        )}
      >
        {label}
      </p>
      <ul className="flex flex-col gap-1.5">{children}</ul>
    </div>
  );
}

function BondRow({
  name,
  description,
  members,
  present,
  total,
  active,
  missingLabel,
}: {
  name: string;
  description: string;
  members: string[];
  present: number;
  total: number;
  active?: boolean;
  missingLabel?: string;
}) {
  return (
    <li
      className={cn(
        "border-2 px-2 py-1.5",
        active ? "border-[var(--color-good)]/50 bg-[var(--color-good)]/5" : "border-ink-800",
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-display text-sm font-bold uppercase italic">{name}</span>
        <span className="shrink-0 text-[11px] text-ink-500 tnum">
          {present}/{total}
        </span>
      </div>
      <p className="mt-0.5 text-[11px] text-ink-400">{members.join(" · ")}</p>
      {description ? (
        <p className="mt-0.5 line-clamp-2 text-[11px] text-ink-500">{description}</p>
      ) : null}
      {missingLabel ? <p className="mt-0.5 text-[11px] text-amber-400/80">{missingLabel}</p> : null}
    </li>
  );
}

function GaugesSection({
  synergy,
  passives,
}: {
  synergy: SynergyResult;
  passives: import("@/domain/types").Passive[];
}) {
  const { t, locale } = useI18n();
  const passivesById = useMemo(() => new Map(passives.map((p) => [p.id, p])), [passives]);
  const active = GAUGE_STATS.map((stat) => {
    const modifier = synergy.gauges[stat];
    if (!modifier || (modifier.guaranteed === 0 && modifier.conditional === 0)) return null;
    return { stat, modifier };
  }).filter((row): row is NonNullable<typeof row> => row !== null);

  if (active.length === 0) return null;

  return (
    <Panel title={t("synergy.gauges")}>
      <PanelHint>{t("synergy.gaugesHint")}</PanelHint>

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
                            ...contribution.conditions.map((c) => conditionLabel(t, c)),
                            ...(contribution.note ? [scopeNoteLabel(t, contribution.note)] : []),
                          ].join(", ")}
                          )
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function Distribution({
  label,
  entries,
  total,
}: {
  label: string;
  entries: {
    key: string;
    label: string;
    count: number;
    className: string;
    icon?: React.ReactNode;
  }[];
  total: number;
}) {
  if (entries.length === 0) return null;

  return (
    <div>
      <p className="label-display mb-1">{label}</p>
      <div className="flex flex-wrap gap-1">
        {entries.map((entry) => (
          <Chip
            key={entry.key}
            icon={entry.icon}
            className={cn("border-ink-700", entry.className)}
            title={`${entry.label}: ${entry.count}/${total}`}
          >
            {!entry.icon && entry.label}
            <span className="font-semibold tnum">{entry.count}</span>
          </Chip>
        ))}
      </div>
    </div>
  );
}
