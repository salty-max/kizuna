import { WandSparkles } from "lucide-react";

import { countEmptyPassives, fillBestPassives } from "@/domain/fillBest";
import {
  MAX_SLOT_PASSIVES,
  passiveSourceFor,
  passiveValueForRarity,
  type ResolvedSlot,
  type SlotAssignment,
} from "@/domain/team";
import type { Dataset, Passive, PassiveSource } from "@/domain/types";
import { passiveDisplayDescription, useI18n } from "@/i18n";
import { Button, NumberInput, Panel, Select } from "../ui";

interface Props {
  slot: ResolvedSlot;
  assignment: SlotAssignment;
  dataset: Dataset;
  passivesBySource: Map<PassiveSource, Passive[]>;
  onChange: (next: SlotAssignment) => void;
}

export function SlotPassivesPanel({
  slot,
  assignment,
  dataset,
  passivesBySource,
  onChange,
}: Props) {
  const { t, locale } = useI18n();

  return (
    <Panel
      as="h3"
      title={t("editor.passives")}
      action={
        slot.player && countEmptyPassives(assignment) > 0 ? (
          <Button
            onClick={() =>
              onChange(
                fillBestPassives(
                  assignment,
                  slot.kind,
                  slot.expectedPosition ?? slot.player?.position ?? null,
                  dataset,
                ),
              )
            }
            title={t("editor.fillPassivesHint")}
            icon={<WandSparkles className="size-3.5" />}
            className="text-[11px]"
          >
            {t("editor.fillPassives")}
          </Button>
        ) : null
      }
    >
      <div className="flex flex-col gap-2">
        {Array.from({ length: MAX_SLOT_PASSIVES }, (_, index) => {
          const source = passiveSourceFor(slot.kind, index);
          const options = passivesBySource.get(source) ?? [];
          const current = assignment.passives[index] ?? { passiveId: null, value: 0 };
          const selected = current.passiveId
            ? (options.find((passive) => passive.id === current.passiveId) ??
              dataset.passives.find((passive) => passive.id === current.passiveId))
            : undefined;
          const unparsed = selected != null && selected.effects.length === 0;

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
                      const parsed = passive.effects.length > 0;
                      return {
                        value: passive.id,
                        label: `#${passive.number} · ${text}`,
                        render: (
                          <span className="flex min-w-0 items-baseline gap-1.5">
                            <span className="shrink-0 text-ink-500 tnum">#{passive.number}</span>
                            <span className="min-w-0 truncate">{text}</span>
                            {!parsed && (
                              <span className="shrink-0 text-[10px] tracking-wide text-ink-500 uppercase">
                                {t("wiki.effectsUnparsed")}
                              </span>
                            )}
                          </span>
                        ),
                      };
                    }),
                  ]}
                  onChange={(passiveId) => {
                    const next = options.find((passive) => passive.id === passiveId);
                    const passives = [...assignment.passives];
                    const value =
                      passiveId && next
                        ? passiveValueForRarity(next, assignment.rarity, dataset.passives)
                        : 0;
                    passives[index] = { passiveId: passiveId || null, value };
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
                  step={selected?.effects.every((effect) => effect.mode === "flat") ? "1" : "0.1"}
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
                <span className="shrink-0 text-xs text-ink-500">
                  {selected?.effects.length &&
                  selected.effects.every((effect) => effect.mode === "flat")
                    ? ""
                    : "%"}
                </span>
              </div>
              {unparsed && (
                <p className="pl-[5.5rem] text-[11px] text-ink-500">
                  {t("editor.passivesEffectsGap")}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
