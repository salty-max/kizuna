import { useMemo } from "react";

import { resolveEquippedSynergies } from "@/domain/bonds";
import type { BuildRank } from "@/domain/buildRank";
import type { SynergyResult } from "@/domain/synergy";
import type { ResolvedTeam } from "@/domain/team";
import type { BuildType, Dataset } from "@/domain/types";
import { BuildRankSection } from "./synergy-panel/BuildRankSection";
import { CompositionSection } from "./synergy-panel/CompositionSection";
import { TeamOverviewSection } from "./synergy-panel/TeamOverviewSection";
import {
  GaugesSection,
  TotalPowerSection,
  UnresolvedSection,
} from "./synergy-panel/PowerSummarySections";
import { SynergyAttachmentsSection } from "./synergy-panel/SynergyAttachmentsSection";
import { TacticsSection } from "./synergy-panel/TacticsSection";

interface Props {
  resolved: ResolvedTeam;
  synergy: SynergyResult;
  dataset: Dataset;
  tacticIds: string[];
  onTacticsChange: (tacticIds: string[]) => void;
  offensiveSynergyId: string | null;
  defensiveSynergyId: string | null;
  onSynergiesChange: (ids: {
    offensiveSynergyId: string | null;
    defensiveSynergyId: string | null;
  }) => void;
  teamBuildType: BuildType | null;
  buildRank: BuildRank;
  onBuildRankChange: (next: { teamBuildType: BuildType | null; buildRank: BuildRank }) => void;
  mode?: "all" | "setup" | "analysis";
}

export function SynergyPanel({
  resolved,
  synergy,
  dataset,
  tacticIds,
  onTacticsChange,
  offensiveSynergyId,
  defensiveSynergyId,
  onSynergiesChange,
  teamBuildType,
  buildRank,
  onBuildRankChange,
  mode = "all",
}: Props) {
  const equippedSynergies = useMemo(
    () => resolveEquippedSynergies(resolved, dataset.synergies),
    [resolved, dataset.synergies],
  );

  return (
    <div className={mode === "all" ? "flex flex-col gap-4" : "cockpit-stack flex flex-col"}>
      {(mode === "all" || mode === "setup") && (
        <>
          <BuildRankSection
            teamBuildType={teamBuildType}
            buildRank={buildRank}
            onChange={onBuildRankChange}
          />
          <TacticsSection
            tactics={dataset.tactics}
            tacticIds={tacticIds}
            onChange={onTacticsChange}
          />
          <SynergyAttachmentsSection
            synergies={dataset.synergies}
            offensiveSynergyId={offensiveSynergyId}
            defensiveSynergyId={defensiveSynergyId}
            equipped={equippedSynergies}
            onChange={onSynergiesChange}
          />
        </>
      )}
      {mode === "all" && (
        <>
          <CompositionSection resolved={resolved} />
          <TotalPowerSection synergy={synergy} />
        </>
      )}
      {mode === "analysis" && <TeamOverviewSection resolved={resolved} synergy={synergy} />}
      {(mode === "all" || mode === "analysis") && (
        <>
          <GaugesSection synergy={synergy} passives={dataset.passives} />
          <UnresolvedSection synergy={synergy} passives={dataset.passives} />
        </>
      )}
    </div>
  );
}
