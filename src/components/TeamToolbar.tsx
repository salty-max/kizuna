import type { ReactNode } from "react";
import {
  Download,
  FolderOpen,
  ImageDown,
  Redo2,
  Save,
  Share2,
  Shirt,
  Trash2,
  Undo2,
  WandSparkles,
} from "lucide-react";

import { Button, CountBadge, IconButton, Select, TextInput } from "@/components/ui";
import { countEmptyEquipmentOnTeam, countEmptySlots } from "@/domain/fillBest";
import { FORMATIONS } from "@/domain/formations";
import { RULESET_IDS } from "@/domain/rules";
import { applyFormation, type Team } from "@/domain/team";
import type { Player } from "@/domain/types";
import { useI18n } from "@/i18n";
import { formationLabel } from "@/i18n/labels";
import { cn } from "@/lib/ui";

/**
 * Team-scoped controls under the app top bar: identity, formation, local save
 * and share. Not app navigation — that lives in `TopBar`.
 *
 * A single dense command bar on desktop; wrapping remains available on narrow
 * screens without reserving two permanent rows above the tactical workspace.
 */

interface Props {
  team: Team;
  players: readonly Player[];
  onTeamChange: (team: Team) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onFillEmpty?: () => void;
  onFillGear?: () => void;
  onClear: () => void;
  savedCount: number;
  savedOpen: boolean;
  onSavedOpenChange: (open: boolean) => void;
  onSave: () => void;
  onImport: () => void;
  onExport: () => void;
  exporting: boolean;
  onShare: () => void;
  savedMenu: ReactNode;
  className?: string;
}

export function TeamToolbar({
  team,
  players,
  onTeamChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onFillEmpty,
  onFillGear,
  onClear,
  savedCount,
  savedOpen,
  onSavedOpenChange,
  onSave,
  onImport,
  onExport,
  exporting,
  onShare,
  savedMenu,
  className,
}: Props) {
  const { t } = useI18n();
  const emptyCount = countEmptySlots(team);
  const emptyGear = countEmptyEquipmentOnTeam(team);
  const canClear = Object.values(team.slots).some((assignment) => assignment.playerId != null);

  return (
    <div
      className={cn(
        "panel flex shrink-0 flex-wrap items-center gap-2 p-2 lg:flex-nowrap",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 lg:flex-nowrap">
        <TextInput
          value={team.name}
          onChange={(event) => onTeamChange({ ...team, name: event.target.value })}
          placeholder={t("team.defaultName")}
          className="min-w-[9rem] flex-1 lg:w-44 lg:flex-none"
          aria-label={t("app.teamName")}
        />

        <Select
          value={team.formationId}
          options={FORMATIONS.map((formation) => ({
            value: formation.id,
            label: formationLabel(t, formation),
          }))}
          onChange={(id) => onTeamChange(applyFormation(team, id, players))}
          aria-label={t("app.formation")}
          className="w-40 lg:w-44"
        />

        <Select
          value={team.rulesetId}
          options={RULESET_IDS.map((id) => ({ value: id, label: t(`rulesets.${id}`) }))}
          onChange={(rulesetId) => onTeamChange({ ...team, rulesetId })}
          aria-label={t("app.ruleset")}
          className="w-36"
        />
      </div>

      <div className="flex w-full flex-wrap items-center gap-2 border-t-2 border-ink-800 pt-2 lg:w-auto lg:flex-nowrap lg:border-t-0 lg:border-l-2 lg:pt-0 lg:pl-2">
        <div className="flex items-center gap-1 border-r-2 border-ink-800 pr-2">
          <IconButton
            onClick={onUndo}
            disabled={!canUndo}
            aria-label={t("app.undo")}
            title={`${t("app.undo")} · Ctrl/⌘ Z`}
          >
            <Undo2 className="size-4" />
          </IconButton>
          <IconButton
            onClick={onRedo}
            disabled={!canRedo}
            aria-label={t("app.redo")}
            title={`${t("app.redo")} · Ctrl/⌘ ⇧ Z`}
          >
            <Redo2 className="size-4" />
          </IconButton>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
          {onFillEmpty && (
            <Button
              onClick={onFillEmpty}
              title={t("app.fillEmptyHint")}
              aria-label={t("app.fillEmpty")}
              icon={<WandSparkles className="size-4" />}
            >
              <span className="hidden 2xl:inline">{t("app.fillEmpty")}</span>
              {emptyCount > 0 && <CountBadge>{emptyCount}</CountBadge>}
            </Button>
          )}
          {onFillGear && (
            <Button
              onClick={onFillGear}
              disabled={emptyGear === 0}
              title={emptyGear === 0 ? t("app.fillGearNone") : t("app.fillGearHint")}
              aria-label={t("app.fillGear")}
              icon={<Shirt className="size-4" />}
            >
              <span className="hidden 2xl:inline">{t("app.fillGear")}</span>
              {emptyGear > 0 && <CountBadge>{emptyGear}</CountBadge>}
            </Button>
          )}
          <Button
            variant="danger"
            onClick={onClear}
            disabled={!canClear}
            title={canClear ? t("app.clearTeamHint") : t("app.clearTeamNone")}
            aria-label={t("app.clearTeam")}
            icon={<Trash2 className="size-4" />}
          >
            <span className="hidden 2xl:inline">{t("app.clearTeam")}</span>
          </Button>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2 lg:flex-nowrap">
          <div className="relative">
            <Button
              onClick={() => onSavedOpenChange(!savedOpen)}
              aria-expanded={savedOpen}
              aria-label={t("app.myTeams")}
              icon={<FolderOpen className="size-4" />}
            >
              <span className="hidden 2xl:inline">{t("app.myTeams")}</span>
              {savedCount > 0 && <CountBadge>{savedCount}</CountBadge>}
            </Button>
            {savedMenu}
          </div>

          <Button
            onClick={onSave}
            icon={<Save className="size-4" />}
            aria-label={t("app.save")}
            title={t("app.save")}
          >
            <span className="lg:hidden 2xl:inline">{t("app.save")}</span>
          </Button>

          <Button
            onClick={onImport}
            icon={<Download className="size-4" />}
            aria-label={t("app.import")}
            title={t("app.import")}
          >
            <span className="lg:hidden 2xl:inline">{t("app.import")}</span>
          </Button>

          <Button
            onClick={onExport}
            disabled={exporting}
            icon={<ImageDown className="size-4" />}
            aria-label={exporting ? t("app.exportingImage") : t("app.exportImage")}
            title={t("app.exportImage")}
          >
            <span className="lg:hidden 2xl:inline">
              {exporting ? t("app.exportingImage") : t("app.exportImage")}
            </span>
          </Button>

          <Button
            variant="primary"
            onClick={onShare}
            aria-label={t("app.share")}
            icon={<Share2 className="size-4" />}
          >
            <span className="hidden 2xl:inline">{t("app.share")}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
