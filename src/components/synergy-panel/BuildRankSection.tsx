import { BUILD_RANKS, type BuildRank } from "@/domain/buildRank";
import { BUILD_TYPES, type BuildType } from "@/domain/types";
import { useI18n } from "@/i18n";
import { buildTypeLabel } from "@/i18n/labels";
import { Panel, Select } from "../ui";

interface Props {
  teamBuildType: BuildType | null;
  buildRank: BuildRank;
  onChange: (next: { teamBuildType: BuildType | null; buildRank: BuildRank }) => void;
}

export function BuildRankSection({ teamBuildType, buildRank, onChange }: Props) {
  const { t } = useI18n();

  return (
    <Panel title={t("synergy.buildRank")} bodyClassName="flex flex-col gap-2">
      <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="label-display text-ink-500">{t("synergy.teamBuild")}</span>
          <Select
            value={teamBuildType ?? ""}
            aria-label={t("synergy.teamBuild")}
            options={[
              { value: "", label: t("synergy.teamBuildEmpty") },
              ...BUILD_TYPES.map((type) => ({ value: type, label: buildTypeLabel(t, type) })),
            ]}
            onChange={(value) =>
              onChange({
                teamBuildType: (value || null) as BuildType | null,
                buildRank: value ? buildRank : 0,
              })
            }
          />
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="label-display text-ink-500">{t("synergy.simulatedRank")}</span>
          <Select
            value={String(buildRank)}
            disabled={!teamBuildType}
            aria-label={t("synergy.simulatedRank")}
            options={BUILD_RANKS.map((rank) => ({ value: String(rank), label: String(rank) }))}
            onChange={(value) => onChange({ teamBuildType, buildRank: Number(value) as BuildRank })}
          />
        </div>
      </div>
      {teamBuildType ? (
        <p className="text-[11px] text-ink-400">{t(`synergy.buildRankRules.${teamBuildType}`)}</p>
      ) : null}
      <p className="text-[11px] text-ink-500">{t("synergy.buildRankHint")}</p>
    </Panel>
  );
}
