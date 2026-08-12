import { useMemo } from "react";
import { ExternalLink, Shirt, Trash2, UserPlus } from "lucide-react";

import { imageUrl } from "@/data/load";
import { POWER_KEYS, STAT_KEYS, type PowerKey } from "@/domain/stats";
import type { Modifier, SynergyResult } from "@/domain/synergy";
import {
  MAX_SLOT_PASSIVES,
  passiveSourceFor,
  type ResolvedSlot,
  type SlotAssignment,
} from "@/domain/team";
import {
  BUILD_TYPES,
  EQUIPMENT_SLOTS,
  RARITIES,
  RARITY_SCALES,
  type BuildType,
  type Dataset,
  type Equipment,
  type EquipmentSlot,
  type Passive,
  type Rarity,
} from "@/domain/types";
import {
  abilityDisplayName,
  contributionPlayerName,
  equipmentDisplayName,
  passiveDisplayDescription,
  playerDisplayName,
  playerInitials,
  useI18n,
} from "@/i18n";
import {
  abilityTypeLabel,
  buildTypeLabel,
  conditionLabel,
  equipmentSlotLabel,
  powerFormula,
  powerLabel,
  rarityDisplayLabel,
  scopeNoteLabel,
  statLabel,
} from "@/i18n/labels";
import { ELEMENT_STYLES, cn, formatPercent, rarityStyle } from "@/lib/ui";
import { AbilityIcon, ElementBadge, PositionBadge, StaffIcon, StyleBadge } from "./GameIcon";
import {
  Button,
  Callout,
  DataList,
  DataRow,
  IconButton,
  LinkButton,
  NumberInput,
  Panel,
  PanelHint,
  Select,
  Tab,
} from "./ui";
import { StatRadar } from "./StatRadar";

interface Props {
  slot: ResolvedSlot;
  assignment: SlotAssignment;
  dataset: Dataset;
  synergy: SynergyResult;
  onChange: (next: SlotAssignment) => void;
  onOpenPicker: () => void;
}

export function SlotEditor({ slot, assignment, dataset, synergy, onChange, onOpenPicker }: Props) {
  const { t, locale, showOriginalNames } = useI18n();
  const staffOnly = slot.kind === "coach" || slot.kind === "manager";
  const displayName = playerDisplayName(slot.player, showOriginalNames, locale);

  const passivesBySource = useMemo(() => {
    const groups = new Map<string, Passive[]>();
    for (const passive of dataset.passives) {
      const group = groups.get(passive.source);
      if (group) group.push(passive);
      else groups.set(passive.source, [passive]);
    }
    for (const group of groups.values()) group.sort((a, b) => a.number - b.number);
    return groups;
  }, [dataset.passives]);

  const equipmentBySlot = useMemo(() => {
    const groups = new Map<EquipmentSlot, Equipment[]>();
    for (const item of dataset.equipment) {
      const group = groups.get(item.slot);
      if (group) group.push(item);
      else groups.set(item.slot, [item]);
    }
    for (const group of groups.values())
      group.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
    return groups;
  }, [dataset.equipment]);

  // Un Hero n'a pas de seconde branche : l'onglet ne doit pas s'afficher pour
  // une forme qui n'en propose pas.
  const activeSkillSet =
    (assignment.rarity === "hero" && slot.player?.heroSkills) ||
    (assignment.rarity === "basara" && slot.player?.basaraSkills) ||
    (slot.player ? { skills: slot.player.skills, skillsAlt: slot.player.skillsAlt } : null);
  const hasAltBranch = (activeSkillSet?.skillsAlt.length ?? 0) > 0;

  const modifiers = synergy.power.get(slot.slotId);
  const effective = synergy.effective.get(slot.slotId);
  const potential = synergy.potential.get(slot.slotId);

  return (
    <div className="flex flex-col gap-4">
      {/* ── Identity ─────────────────────────────────────────────────────── */}
      <Panel raised bodyClassName="p-3">
        {slot.player ? (
          <div className="flex items-start gap-3">
            {slot.player.image ? (
              <img
                src={imageUrl(dataset.imageBase, slot.player.image, 128)}
                alt={displayName}
                width={64}
                height={64}
                className={cn(
                  "size-16 shrink-0 object-cover ring-2 ring-inset",
                  ELEMENT_STYLES[slot.player.element].ring,
                  ELEMENT_STYLES[slot.player.element].bg,
                )}
              />
            ) : (
              <div
                className={cn(
                  "flex size-16 shrink-0 items-center justify-center text-lg font-semibold ring-2 ring-inset",
                  ELEMENT_STYLES[slot.player.element].ring,
                  ELEMENT_STYLES[slot.player.element].bg,
                  ELEMENT_STYLES[slot.player.element].text,
                )}
              >
                {playerInitials(displayName)}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <h2 className="truncate font-display text-base font-bold uppercase italic">
                {displayName}
              </h2>
              <p className="truncate text-xs text-ink-500">
                {showOriginalNames &&
                slot.player.nameOriginal &&
                slot.player.nameOriginal !== slot.player.name
                  ? `${slot.player.name} · ${slot.player.game}`
                  : slot.player.game}
              </p>

              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                <PositionBadge position={slot.player.position} variant="badge" size={18} />
                <ElementBadge element={slot.player.element} variant="full" size={16} />
                {slot.buildType && (
                  <StyleBadge buildType={slot.buildType} variant="full" size={16} />
                )}
                <span className="text-ink-500">{slot.player.ageGroup}</span>
              </div>

              {!staffOnly && (
                <div className="mt-2 flex flex-col gap-1">
                  <label className="flex items-center gap-2">
                    <span className="w-14 shrink-0 text-xs text-ink-500">{t("editor.rarity")}</span>
                    <Select
                      value={assignment.rarity}
                      options={RARITIES.map((rarity) => ({
                        value: rarity,
                        label: `${rarityDisplayLabel(t, rarity, slot.buildType)} ×${
                          RARITY_SCALES[rarity].multiplier
                        }${
                          RARITY_SCALES[rarity].flatBonus > 0
                            ? t("editor.flatPerStat", { n: RARITY_SCALES[rarity].flatBonus })
                            : ""
                        }`,
                        render: (
                          <span className="flex items-center gap-1.5">
                            <span
                              aria-hidden="true"
                              className={cn(
                                "inline-block h-2.5 w-4 shrink-0",
                                rarityStyle(rarity, slot.buildType).badge,
                              )}
                            />
                            {rarityDisplayLabel(t, rarity, slot.buildType)} ×
                            {RARITY_SCALES[rarity].multiplier}
                          </span>
                        ),
                      }))}
                      onChange={(next) => onChange({ ...assignment, rarity: next as Rarity })}
                      aria-label={t("editor.rarity")}
                      className={cn("flex-1", rarityStyle(assignment.rarity, slot.buildType).badge)}
                    />
                  </label>

                  <label className="flex items-center gap-2">
                    <span className="w-14 shrink-0 text-xs text-ink-500">
                      {t("editor.archetype")}
                    </span>
                    <Select
                      value={assignment.buildType ?? ""}
                      options={[
                        {
                          value: "",
                          label: slot.player.buildType
                            ? t("editor.archetypeFromGame", {
                                name: buildTypeLabel(t, slot.player.buildType),
                              })
                            : t("editor.archetypeUnknown"),
                        },
                        ...BUILD_TYPES.map((buildType) => ({
                          value: buildType,
                          label: buildTypeLabel(t, buildType),
                          render: (
                            <span className="flex items-center gap-1.5">
                              <StyleBadge buildType={buildType} variant="icon" size={14} />
                              {buildTypeLabel(t, buildType)}
                            </span>
                          ),
                        })),
                      ]}
                      onChange={(next) =>
                        onChange({ ...assignment, buildType: (next || null) as BuildType | null })
                      }
                      aria-label={t("editor.archetype")}
                      className="flex-1"
                    />
                  </label>

                  <p className="text-[11px] text-ink-500">{t("editor.archetypeHint")}</p>

                  {assignment.rarity === "hero" && !slot.buildType && (
                    <Callout tone="warn">{t("editor.heroNeedsArchetype")}</Callout>
                  )}

                  {assignment.rarity === "hero" && slot.player.heroStats && (
                    <p className="text-[11px] text-ink-500">{t("editor.realHeroTable")}</p>
                  )}
                  {assignment.rarity === "basara" && slot.player.basaraStats && (
                    <p className="text-[11px] text-ink-500">{t("editor.realBasaraTable")}</p>
                  )}
                  {assignment.rarity === "hero" &&
                    !slot.player.heroStats &&
                    RARITY_SCALES.hero.estimated && (
                      <Callout tone="warn">
                        {t("editor.estimatedHero", { mult: RARITY_SCALES.hero.multiplier })}
                      </Callout>
                    )}
                  {assignment.rarity === "basara" &&
                    !slot.player.basaraStats &&
                    RARITY_SCALES.basara.estimated && (
                      <Callout tone="warn">
                        {t("editor.estimatedBasara", { mult: RARITY_SCALES.basara.multiplier })}
                      </Callout>
                    )}
                </div>
              )}

              {!slot.positionMatch && (
                <Callout tone="warn">
                  {t("editor.outOfPosition", {
                    player: slot.player.position,
                    expected: slot.expectedPosition ?? "",
                  })}
                </Callout>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <Button size="sm" onClick={onOpenPicker}>
                {t("editor.change")}
              </Button>
              <IconButton
                tone="danger"
                onClick={() => onChange({ ...assignment, playerId: null })}
                aria-label={t("editor.clear")}
              >
                <Trash2 className="size-3.5" />
              </IconButton>
            </div>
          </div>
        ) : staffOnly ? (
          <div className="flex items-center gap-3">
            <div className="flex size-16 shrink-0 items-center justify-center border-2 border-ink-700 bg-ink-900">
              <StaffIcon
                kind={slot.kind === "coach" ? "coach" : "manager"}
                size={28}
                className="opacity-80"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-base font-bold uppercase italic">
                {slot.kind === "coach"
                  ? t("pitch.coach")
                  : t("pitch.manager", {
                      n: slot.slotId.replace("manager", ""),
                    })}
              </h2>
              <p className="text-xs text-ink-500">{t("pitch.staffHint")}</p>
              <div className="mt-2">
                <Button size="sm" onClick={onOpenPicker} icon={<UserPlus className="size-3.5" />}>
                  {t("editor.assign")}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <Button
            variant="primary"
            onClick={onOpenPicker}
            icon={<UserPlus className="size-4" />}
            className="w-full py-3"
          >
            {t("editor.assign")}
          </Button>
        )}
      </Panel>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      {slot.player && !staffOnly && (
        <Panel as="h3" title={t("editor.baseStats")}>
          <PanelHint>
            {slot.rarity === "common"
              ? t("editor.baseStatsCommon")
              : slot.rarity === "hero" && slot.player.heroStats
                ? t("editor.baseStatsHero")
                : slot.rarity === "basara" && slot.player.basaraStats
                  ? t("editor.baseStatsBasara")
                  : t("editor.baseStatsScaled", {
                      mult: RARITY_SCALES[slot.rarity].multiplier,
                      flat:
                        RARITY_SCALES[slot.rarity].flatBonus > 0
                          ? t("editor.flatBonus", { n: RARITY_SCALES[slot.rarity].flatBonus })
                          : "",
                      rarity: rarityDisplayLabel(t, slot.rarity, slot.buildType),
                    })}
          </PanelHint>

          <div className="mb-3 flex justify-center border-b border-ink-800 pb-3">
            <StatRadar
              stats={slot.stats}
              base={
                // Only draw the inner ring when gear actually moves a stat —
                // otherwise the two polys stack and look like a glitch.
                STAT_KEYS.some((key) => slot.stats[key] !== slot.scaledStats[key])
                  ? slot.scaledStats
                  : undefined
              }
              size={200}
            />
          </div>
          {STAT_KEYS.some((key) => slot.stats[key] !== slot.scaledStats[key]) && (
            <p className="mb-2 text-center text-[10px] text-ink-500">
              <span className="mr-2 inline-block size-2 rounded-full bg-bolt-400 align-middle" />
              {t("editor.radarFinal")}
              <span className="mx-2 inline-block w-3 border-t border-dashed border-ink-500 align-middle" />
              {t("editor.radarBase")}
            </p>
          )}

          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {STAT_KEYS.map((key) => {
              // Rarity and equipment are separate layers: the multiplier applies
              // to the character, the equipment is flat on top.
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
      )}

      {/* ── Power ────────────────────────────────────────────────────────── */}
      {slot.player && !staffOnly && modifiers && effective && potential && (
        <Panel as="h3" title={t("editor.power")}>
          <PanelHint>{t("editor.powerHint")}</PanelHint>

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

          <Contributions modifiers={modifiers} passives={dataset.passives} />
        </Panel>
      )}

      {/* ── Equipment ────────────────────────────────────────────────────── */}
      {!staffOnly && (
        <Panel as="h3" title={t("editor.equipment")}>
          <div className="flex flex-col gap-2">
            {EQUIPMENT_SLOTS.map((equipmentSlot) => {
              const items = equipmentBySlot.get(equipmentSlot) ?? [];
              const current = assignment.equipment[equipmentSlot] ?? "";
              const equipped = items.find((item) => item.id === current);
              return (
                <label key={equipmentSlot} className="flex min-w-0 items-center gap-2">
                  <EquipmentIcon item={equipped} />
                  <span className="w-16 shrink-0 text-xs text-ink-500">
                    {equipmentSlotLabel(t, equipmentSlot)}
                  </span>
                  <Select
                    value={current}
                    options={[
                      { value: "", label: "—" },
                      ...items.map((item) => {
                        const itemName = equipmentDisplayName(item, locale);
                        return {
                          value: item.id,
                          label: `${itemName} (+${item.total})`,
                          render: (
                            <span className="flex min-w-0 items-center gap-1.5">
                              <EquipmentIcon item={item} size={18} />
                              <span className="min-w-0 truncate">{itemName}</span>
                              <span className="ml-auto shrink-0 text-ink-500 tnum">
                                +{item.total}
                              </span>
                            </span>
                          ),
                        };
                      }),
                    ]}
                    onChange={(next) =>
                      onChange({
                        ...assignment,
                        equipment: { ...assignment.equipment, [equipmentSlot]: next || undefined },
                      })
                    }
                    aria-label={equipmentSlotLabel(t, equipmentSlot)}
                    searchable
                    searchPlaceholder={t("editor.search")}
                    emptyLabel={t("editor.searchEmpty")}
                    className="min-w-0 flex-1"
                  />
                </label>
              );
            })}
          </div>
        </Panel>
      )}

      {/* ── Skills ───────────────────────────────────────────────────────── */}
      {slot.player && !staffOnly && slot.skills.length > 0 && (
        <Panel as="h3" title={t("editor.skills")}>
          <PanelHint>{t("editor.skillsHint")}</PanelHint>

          {hasAltBranch && (
            <div role="tablist" className="mb-2 flex gap-1">
              <Tab
                active={!assignment.altBranch}
                onClick={() => onChange({ ...assignment, altBranch: false })}
              >
                {t("editor.branchMain")}
              </Tab>
              <Tab
                active={assignment.altBranch}
                onClick={() => onChange({ ...assignment, altBranch: true })}
              >
                {t("editor.branchAlt")}
              </Tab>
            </div>
          )}

          <DataList>
            {slot.skills.map((skill) => (
              <DataRow
                key={`${skill.level}-${skill.ability.id}`}
                className={cn(skill.fromAltBranch && "text-bolt-400")}
                label={
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="w-8 shrink-0 text-ink-500 tnum">
                      {t("editor.level")} {skill.level}
                    </span>
                    {/* Badge puis élément : ce qu'on cherche d'abord dans une
                        liste, c'est « tir, arrêt, ou quelle aura ». */}
                    <AbilityIcon ability={skill.ability} size={16} />
                    {skill.ability.element && (
                      <ElementBadge element={skill.ability.element} variant="icon" size={14} />
                    )}
                    <span className="min-w-0 truncate normal-case not-italic">
                      {abilityDisplayName(skill.ability, locale)}
                    </span>
                  </span>
                }
                value={
                  skill.ability.power > 0 ? (
                    skill.ability.power
                  ) : (
                    <span className="text-[11px] text-ink-500">
                      {abilityTypeLabel(t, skill.ability.type)}
                    </span>
                  )
                }
                extra={skill.ability.tension > 0 ? `${skill.ability.tension} TP` : undefined}
              />
            ))}
          </DataList>
        </Panel>
      )}

      {/* ── Passives ─────────────────────────────────────────────────────── */}
      <Panel as="h3" title={t("editor.passives")}>
        <PanelHint>{t("editor.passivesHint")}</PanelHint>
        {/* Dump ships text + magnitude only — no scope/stat tree yet. */}
        <Callout tone="info" className="mb-2">
          {t("editor.passivesEffectsGap")}
        </Callout>

        <div className="flex flex-col gap-2">
          {Array.from({ length: MAX_SLOT_PASSIVES }, (_, index) => {
            const source = passiveSourceFor(slot.kind, index);
            const options = passivesBySource.get(source) ?? [];
            const current = assignment.passives[index] ?? { passiveId: null, value: 0 };
            const selected = options.find((p) => p.id === current.passiveId);

            return (
              <div key={index} className="flex flex-col gap-1">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="w-20 shrink-0 text-xs text-ink-500">
                    {index === MAX_SLOT_PASSIVES - 1
                      ? t("editor.custom")
                      : t("editor.preset", { n: index + 1 })}
                  </span>

                  <Select
                    value={current.passiveId ?? ""}
                    options={[
                      { value: "", label: "—" },
                      ...options.map((passive) => {
                        const text = passiveDisplayDescription(passive, locale);
                        return {
                          value: passive.id,
                          label: `#${passive.number} · ${text}`,
                          render: (
                            <span className="flex min-w-0 items-baseline gap-1.5">
                              <span className="shrink-0 text-ink-500 tnum">#{passive.number}</span>
                              <span className="min-w-0 truncate">{text}</span>
                            </span>
                          ),
                        };
                      }),
                    ]}
                    onChange={(passiveId) => {
                      const next = options.find((p) => p.id === passiveId);
                      const passives = [...assignment.passives];
                      passives[index] = {
                        passiveId: passiveId || null,
                        // Seed with the strong value so a freshly picked passive
                        // does something; it stays fully editable.
                        value: passiveId ? (next?.strongValue ?? 0) : 0,
                      };
                      onChange({ ...assignment, passives });
                    }}
                    aria-label={
                      index === MAX_SLOT_PASSIVES - 1
                        ? t("editor.custom")
                        : t("editor.preset", { n: index + 1 })
                    }
                    searchable
                    searchPlaceholder={t("editor.search")}
                    emptyLabel={t("editor.searchEmpty")}
                    className="min-w-0 flex-1"
                  />

                  <NumberInput
                    step="0.1"
                    value={current.value || ""}
                    disabled={!current.passiveId}
                    onChange={(event) => {
                      const passives = [...assignment.passives];
                      passives[index] = {
                        passiveId: current.passiveId,
                        value: Number(event.target.value) || 0,
                      };
                      onChange({ ...assignment, passives });
                    }}
                    className="w-20 shrink-0"
                    aria-label={t("editor.percentValue")}
                  />
                  <span className="shrink-0 text-xs text-ink-500">%</span>
                </div>

                {selected && (
                  <p className="pl-22 text-[11px] text-ink-500">
                    {t("editor.bounds", {
                      weak: selected.weakValue,
                      strong: selected.strongValue,
                      build: selected.buildType
                        ? t("editor.buildSuffix", { name: buildTypeLabel(t, selected.buildType) })
                        : "",
                      conditions: "",
                    })}
                    {selected.effects.some((e) => e.conditions.length > 0) && (
                      <span className="text-amber-400/80">
                        {" · "}
                        {selected.effects
                          .flatMap((e) => e.conditions)
                          .map((c) => conditionLabel(t, c))
                          .join(", ")}
                      </span>
                    )}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      {slot.player && (
        <LinkButton
          href="https://zukan.inazuma.jp/en/"
          target="_blank"
          rel="noreferrer noopener"
          size="sm"
          icon={<ExternalLink className="size-3.5" />}
        >
          {t("editor.viewInazugle")}
        </LinkButton>
      )}
    </div>
  );
}

/**
 * Item art comes from Inazugle and roughly one item in eight has no match, so
 * an empty frame is a normal state rather than a failure to signal.
 */
function EquipmentIcon({ item, size = 34 }: { item: Equipment | undefined; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden border-2 border-ink-800 bg-ink-950"
      style={{ width: size, height: size }}
    >
      {item?.image ? (
        <img
          src={item.image}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain"
        />
      ) : (
        <Shirt className={cn("size-4", item ? "text-ink-300" : "text-ink-700")} />
      )}
    </span>
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
  const passivesById = useMemo(() => new Map(passives.map((p) => [p.id, p])), [passives]);
  // One passive usually feeds several power stats; list each passive once.
  const seen = new Map<
    string,
    { description: string; from: string | null; percent: number; conditions: string[] }
  >();

  for (const modifier of Object.values(modifiers)) {
    for (const contribution of modifier.contributions) {
      const key = `${contribution.passiveId}:${contribution.fromSlotId}`;
      if (seen.has(key)) continue;
      const passive = passivesById.get(contribution.passiveId);
      seen.set(key, {
        description: passive
          ? passiveDisplayDescription(passive, locale)
          : contribution.description,
        from: contributionPlayerName(contribution, showOriginalNames),
        percent: contribution.percent,
        conditions: [
          ...contribution.conditions.map((c) => conditionLabel(t, c)),
          ...(contribution.note ? [scopeNoteLabel(t, contribution.note)] : []),
        ],
      });
    }
  }

  if (seen.size === 0) return null;

  return (
    <ul className="mt-2 flex flex-col gap-1 border-t border-ink-850 pt-2 text-[11px]">
      {[...seen.values()].map((entry, index) => (
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
