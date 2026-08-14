import { useMemo } from "react";
import { ExternalLink } from "lucide-react";

import type { SynergyResult } from "@/domain/synergy";
import type { ResolvedSlot, SlotAssignment, Team } from "@/domain/team";
import type { Dataset } from "@/domain/types";
import { useI18n } from "@/i18n";
import { LinkButton } from "./ui";
import { groupEquipmentBySlot, groupPassivesBySource } from "./slot-editor/catalogues";
import { SlotEquipmentPanel } from "./slot-editor/SlotEquipmentPanel";
import { SlotIdentityPanel } from "./slot-editor/SlotIdentityPanel";
import { SlotPassivesPanel } from "./slot-editor/SlotPassivesPanel";
import { SlotPowerPanel } from "./slot-editor/SlotPowerPanel";
import { SlotSkillsPanel } from "./slot-editor/SlotSkillsPanel";
import { SlotStatsPanel } from "./slot-editor/SlotStatsPanel";

interface Props {
  slot: ResolvedSlot;
  assignment: SlotAssignment;
  team: Team;
  dataset: Dataset;
  synergy: SynergyResult;
  onChange: (next: SlotAssignment) => void;
  onOpenPicker: () => void;
}

export function SlotEditor({
  slot,
  assignment,
  team,
  dataset,
  synergy,
  onChange,
  onOpenPicker,
}: Props) {
  const { t } = useI18n();
  const staffOnly = slot.kind === "coach" || slot.kind === "manager";
  const passivesBySource = useMemo(
    () => groupPassivesBySource(dataset.passives),
    [dataset.passives],
  );
  const equipmentBySlot = useMemo(
    () => groupEquipmentBySlot(dataset.equipment),
    [dataset.equipment],
  );

  return (
    <div className="flex flex-col gap-4">
      <SlotIdentityPanel
        slot={slot}
        assignment={assignment}
        team={team}
        dataset={dataset}
        onChange={onChange}
        onOpenPicker={onOpenPicker}
      />

      {slot.player && !staffOnly && <SlotStatsPanel slot={slot} />}
      {slot.player && !staffOnly && (
        <SlotPowerPanel slot={slot} synergy={synergy} passives={dataset.passives} />
      )}
      {!staffOnly && (
        <SlotEquipmentPanel
          slot={slot}
          assignment={assignment}
          dataset={dataset}
          equipmentBySlot={equipmentBySlot}
          onChange={onChange}
        />
      )}
      {slot.player && !staffOnly && slot.skills.length > 0 && (
        <SlotSkillsPanel slot={slot} assignment={assignment} onChange={onChange} />
      )}
      <SlotPassivesPanel
        slot={slot}
        assignment={assignment}
        dataset={dataset}
        passivesBySource={passivesBySource}
        onChange={onChange}
      />

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
