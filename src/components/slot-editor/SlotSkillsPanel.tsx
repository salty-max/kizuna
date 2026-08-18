import type { ResolvedSlot, SlotAssignment } from "@/domain/team";
import { abilityDisplayName, useI18n } from "@/i18n";
import { abilityTypeLabel } from "@/i18n/labels";
import { cn } from "@/lib/ui";
import { AbilityIcon, ElementBadge } from "../GameIcon";
import { DataList, DataRow, Panel, Tab } from "../ui";

interface Props {
  slot: ResolvedSlot;
  assignment: SlotAssignment;
  onChange: (next: SlotAssignment) => void;
}

export function SlotSkillsPanel({ slot, assignment, onChange }: Props) {
  const { t, locale } = useI18n();
  const activeSkillSet =
    (assignment.rarity === "hero" && slot.player?.heroSkills) ||
    (assignment.rarity === "basara" && slot.player?.basaraSkills) ||
    (slot.player ? { skills: slot.player.skills, skillsAlt: slot.player.skillsAlt } : null);
  const hasAltBranch = (activeSkillSet?.skillsAlt.length ?? 0) > 0;

  return (
    <Panel as="h3" title={t("editor.skills")}>
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
            className={cn(skill.fromAltBranch && "text-bolt-ink")}
            label={
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="w-8 shrink-0 text-ink-500 tnum">
                  {t("editor.level")} {skill.level}
                </span>
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
  );
}
