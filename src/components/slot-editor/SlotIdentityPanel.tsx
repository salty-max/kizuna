import { Trash2, UserPlus } from "lucide-react";

import { imageUrl } from "@/data/load";
import {
  isRarityAllowed,
  passiveValueForRarity,
  type ResolvedSlot,
  type SlotAssignment,
  type Team,
} from "@/domain/team";
import {
  BUILD_TYPES,
  MAX_BASARA_IN_SQUAD,
  MAX_HERO_STARTERS,
  RARITIES,
  RARITY_SCALES,
  type BuildType,
  type Dataset,
  type Rarity,
} from "@/domain/types";
import { playerDisplayName, playerInitials, useI18n } from "@/i18n";
import { buildTypeLabel, rarityDisplayLabel } from "@/i18n/labels";
import { ELEMENT_STYLES, cn, rarityStyle } from "@/lib/ui";
import { ElementBadge, PositionBadge, StaffIcon, StyleBadge } from "../GameIcon";
import { Button, Callout, IconButton, Panel, Select } from "../ui";

interface Props {
  slot: ResolvedSlot;
  assignment: SlotAssignment;
  team: Team;
  dataset: Dataset;
  onChange: (next: SlotAssignment) => void;
  onOpenPicker: () => void;
}

export function SlotIdentityPanel({
  slot,
  assignment,
  team,
  dataset,
  onChange,
  onOpenPicker,
}: Props) {
  const { t, locale, showOriginalNames } = useI18n();
  const staffOnly = slot.kind === "coach" || slot.kind === "manager";
  const displayName = playerDisplayName(slot.player, showOriginalNames, locale);

  return (
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
              {slot.buildType && <StyleBadge buildType={slot.buildType} variant="full" size={16} />}
              <span className="text-ink-500">{slot.player.ageGroup}</span>
            </div>

            {!staffOnly && (
              <div className="mt-2 flex flex-col gap-1">
                <label className="flex min-w-0 items-center gap-2">
                  <span className="w-14 shrink-0 text-xs text-ink-500">{t("editor.rarity")}</span>
                  <Select
                    value={assignment.rarity}
                    options={RARITIES.map((rarity) => {
                      const allowed = isRarityAllowed(team, slot.slotId, rarity);
                      const capHint =
                        rarity === "hero" && !allowed
                          ? t("editor.rarityCapHero", { max: MAX_HERO_STARTERS })
                          : rarity === "basara" && !allowed
                            ? t("editor.rarityCapBasara", { max: MAX_BASARA_IN_SQUAD })
                            : "";
                      const label = `${rarityDisplayLabel(t, rarity, slot.buildType)} ×${
                        RARITY_SCALES[rarity].multiplier
                      }${
                        RARITY_SCALES[rarity].flatBonus > 0
                          ? t("editor.flatPerStat", { n: RARITY_SCALES[rarity].flatBonus })
                          : ""
                      }`;
                      return {
                        value: rarity,
                        label: capHint ? `${label} — ${capHint}` : label,
                        disabled: !allowed,
                        render: (
                          <span
                            className={cn(
                              "flex min-w-0 items-center gap-1.5",
                              !allowed && "opacity-40",
                            )}
                          >
                            <span
                              aria-hidden="true"
                              className={cn(
                                "inline-block h-2.5 w-4 shrink-0",
                                rarityStyle(rarity, slot.buildType).badge,
                              )}
                            />
                            <span className="min-w-0 truncate">
                              {rarityDisplayLabel(t, rarity, slot.buildType)} ×
                              {RARITY_SCALES[rarity].multiplier}
                              {capHint ? <span className="text-ink-500"> · {capHint}</span> : null}
                            </span>
                          </span>
                        ),
                      };
                    })}
                    onChange={(next) => {
                      const rarity = next as Rarity;
                      if (!isRarityAllowed(team, slot.slotId, rarity)) return;

                      const passives = assignment.passives.map((row) => {
                        if (!row.passiveId) return row;
                        const passive = dataset.passives.find((item) => item.id === row.passiveId);
                        if (!passive) return row;
                        return {
                          ...row,
                          value: passiveValueForRarity(passive, rarity, dataset.passives),
                        };
                      });
                      onChange({ ...assignment, rarity, passives });
                    }}
                    aria-label={t("editor.rarity")}
                    className={cn(
                      "min-w-0 flex-1",
                      rarityStyle(assignment.rarity, slot.buildType).badge,
                    )}
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

                {assignment.rarity === "hero" && !slot.buildType && (
                  <Callout tone="warn">{t("editor.heroNeedsArchetype")}</Callout>
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
            <Button id={`slot-player-action-${slot.slotId}`} size="sm" onClick={onOpenPicker}>
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
                : t("pitch.manager", { n: slot.slotId.replace("manager", "") })}
            </h2>
            <p className="text-xs text-ink-500">{t("pitch.staffHint")}</p>
            <div className="mt-2">
              <Button
                id={`slot-player-action-${slot.slotId}`}
                size="sm"
                onClick={onOpenPicker}
                icon={<UserPlus className="size-3.5" />}
              >
                {t("editor.assign")}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Button
          id={`slot-player-action-${slot.slotId}`}
          variant="primary"
          onClick={onOpenPicker}
          icon={<UserPlus className="size-4" />}
          className="w-full py-3"
        >
          {t("editor.assign")}
        </Button>
      )}
    </Panel>
  );
}
