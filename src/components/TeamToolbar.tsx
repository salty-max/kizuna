import type { ReactNode } from "react";
import { Download, FolderOpen, Save, Share2 } from "lucide-react";

import { Button, CountBadge, Select, TextInput } from "@/components/ui";
import { FORMATIONS } from "@/domain/formations";
import { applyFormation, type Team } from "@/domain/team";
import { useI18n } from "@/i18n";
import type { SavedTeam } from "@/lib/storage";
import { cn } from "@/lib/ui";

/**
 * Team-scoped controls under the app top bar: identity, formation, local save
 * and share. Not app navigation — that lives in `TopBar`.
 */

interface Props {
  team: Team;
  onTeamChange: (team: Team) => void;
  saved: SavedTeam[];
  savedOpen: boolean;
  onSavedOpenChange: (open: boolean) => void;
  onSave: () => void;
  onImport: () => void;
  onShare: () => void;
  savedMenu: ReactNode;
  className?: string;
}

export function TeamToolbar({
  team,
  onTeamChange,
  saved,
  savedOpen,
  onSavedOpenChange,
  onSave,
  onImport,
  onShare,
  savedMenu,
  className,
}: Props) {
  const { t } = useI18n();

  return (
    <div className={cn("panel flex shrink-0 flex-wrap items-center gap-2 p-2.5", className)}>
      <TextInput
        value={team.name}
        onChange={(event) => onTeamChange({ ...team, name: event.target.value })}
        placeholder={t("team.defaultName")}
        className="w-48 sm:w-56"
        aria-label={t("app.teamName")}
      />

      <Select
        value={team.formationId}
        options={FORMATIONS.map((formation) => ({
          value: formation.id,
          label: formation.name,
        }))}
        onChange={(id) => onTeamChange(applyFormation(team, id))}
        aria-label={t("app.formation")}
        className="w-48 sm:w-52"
      />

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <div className="relative">
          <Button
            onClick={() => onSavedOpenChange(!savedOpen)}
            aria-expanded={savedOpen}
            icon={<FolderOpen className="size-4" />}
          >
            {t("app.myTeams")}
            {saved.length > 0 && <CountBadge>{saved.length}</CountBadge>}
          </Button>
          {savedMenu}
        </div>

        <Button onClick={onSave} icon={<Save className="size-4" />}>
          {t("app.save")}
        </Button>

        <Button onClick={onImport} icon={<Download className="size-4" />}>
          {t("app.import")}
        </Button>

        <Button variant="primary" onClick={onShare} icon={<Share2 className="size-4" />}>
          {t("app.share")}
        </Button>
      </div>
    </div>
  );
}
