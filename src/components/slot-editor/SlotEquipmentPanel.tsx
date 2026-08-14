import { Shirt, WandSparkles } from "lucide-react";

import { countEmptyEquipment, fillBestEquipment } from "@/domain/fillBest";
import type { ResolvedSlot, SlotAssignment } from "@/domain/team";
import { EQUIPMENT_SLOTS, type Dataset, type Equipment, type EquipmentSlot } from "@/domain/types";
import { equipmentDisplayName, useI18n } from "@/i18n";
import { equipmentSlotLabel } from "@/i18n/labels";
import { cn } from "@/lib/ui";
import { InazugleImage } from "../InazugleImage";
import { Button, Panel, Select } from "../ui";

interface Props {
  slot: ResolvedSlot;
  assignment: SlotAssignment;
  dataset: Dataset;
  equipmentBySlot: Map<EquipmentSlot, Equipment[]>;
  onChange: (next: SlotAssignment) => void;
}

export function SlotEquipmentPanel({
  slot,
  assignment,
  dataset,
  equipmentBySlot,
  onChange,
}: Props) {
  const { t, locale } = useI18n();

  return (
    <Panel
      as="h3"
      title={t("editor.equipment")}
      action={
        slot.player && countEmptyEquipment(assignment) > 0 ? (
          <Button
            onClick={() =>
              onChange(
                fillBestEquipment(
                  assignment,
                  slot.expectedPosition ?? slot.player?.position ?? null,
                  dataset,
                ),
              )
            }
            title={t("editor.fillEquipmentHint")}
            icon={<WandSparkles className="size-3.5" />}
            className="text-[11px]"
          >
            {t("editor.fillEquipment")}
          </Button>
        ) : null
      }
    >
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
                          <span className="ml-auto shrink-0 text-ink-500 tnum">+{item.total}</span>
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
  );
}

function EquipmentIcon({ item, size = 34 }: { item: Equipment | undefined; size?: number }) {
  const empty = (
    <span className="flex h-full w-full items-center justify-center">
      <Shirt className={cn("size-4", item ? "text-ink-300" : "text-ink-700")} />
    </span>
  );

  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden border-2 border-ink-800 bg-ink-950"
      style={{ width: size, height: size }}
    >
      {item?.image ? (
        <InazugleImage
          src={item.image}
          kind="equipment"
          alt=""
          loading="lazy"
          frameClassName="h-full w-full"
          className="h-full w-full object-contain"
          fallback={empty}
        />
      ) : (
        empty
      )}
    </span>
  );
}
