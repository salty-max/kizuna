import { useMemo } from "react";

import type { Tactic } from "@/domain/types";
import { tacticDisplayDescription, tacticDisplayName, useI18n } from "@/i18n";
import { TacticIcon } from "../GameIcon";
import { Panel, Select } from "../ui";
import { tacticSlots, updateTacticSlot } from "./tactics";

interface Props {
  tactics: Tactic[];
  tacticIds: string[];
  onChange: (ids: string[]) => void;
}

export function TacticsSection({ tactics, tacticIds, onChange }: Props) {
  const { t, locale } = useI18n();
  const tacticsById = useMemo(
    () => new Map(tactics.map((tactic) => [tactic.id, tactic])),
    [tactics],
  );
  const slots = tacticSlots(tacticIds);

  return (
    <Panel title={t("app.tactics")} bodyClassName="flex flex-col gap-2">
      {slots.map((id, index) => {
        const selectedTactic = tacticsById.get(id);
        const taken = new Set(slots.filter((value, slotIndex) => value && slotIndex !== index));
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
              onChange={(next) => onChange(updateTacticSlot(tacticIds, index, next))}
            />
            {selectedTactic && tacticDisplayDescription(selectedTactic, locale) && (
              <p className="line-clamp-2 text-[11px] text-ink-500 whitespace-pre-line">
                {tacticDisplayDescription(selectedTactic, locale)}
              </p>
            )}
          </div>
        );
      })}
    </Panel>
  );
}
