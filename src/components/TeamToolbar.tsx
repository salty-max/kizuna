import type { ReactNode } from "react";
import { Download, FolderOpen, Save, Share2, Shirt, Trash2, WandSparkles } from "lucide-react";

import { Button, CountBadge, Select, TextInput } from "@/components/ui";
import { countEmptyEquipmentOnTeam, countEmptySlots } from "@/domain/fillBest";
import { FORMATIONS } from "@/domain/formations";
import { RULESET_IDS } from "@/domain/rules";
import { applyFormation, rarityBudget, type Team } from "@/domain/team";
import { useI18n } from "@/i18n";
import { formationLabel } from "@/i18n/labels";
import type { SavedTeam } from "@/lib/storage";
import { cn } from "@/lib/ui";

/**
 * Team-scoped controls under the app top bar: identity, formation, local save
 * and share. Not app navigation — that lives in `TopBar`.
 *
 * Two deliberate rows (identity / actions) instead of a single wrap that
 * collapses into an awkward left cluster + right cluster.
 */

interface Props {
  team: Team;
  onTeamChange: (team: Team) => void;
  onFillEmpty?: () => void;
  onFillGear?: () => void;
  onClear: () => void;
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
  onFillEmpty,
  onFillGear,
  onClear,
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
  const budget = rarityBudget(team);
  const emptyCount = countEmptySlots(team);
  const emptyGear = countEmptyEquipmentOnTeam(team);
  const canClear = Object.values(team.slots).some((assignment) => assignment.playerId != null);

  return (
    <div className={cn("panel flex shrink-0 flex-col gap-2 p-2.5", className)}>
      {/* Identity — team shape and constraints */}
      <div className="flex flex-wrap items-center gap-2">
        <TextInput
          value={team.name}
          onChange={(event) => onTeamChange({ ...team, name: event.target.value })}
          placeholder={t("team.defaultName")}
          className="min-w-[10rem] flex-1 sm:max-w-xs sm:flex-none sm:w-56"
          aria-label={t("app.teamName")}
        />

        <Select
          value={team.formationId}
          options={FORMATIONS.map((formation) => ({
            value: formation.id,
            label: formationLabel(t, formation),
          }))}
          onChange={(id) => onTeamChange(applyFormation(team, id))}
          aria-label={t("app.formation")}
          className="w-44 sm:w-52"
        />

        <Select
          value={team.rulesetId}
          options={RULESET_IDS.map((id) => ({ value: id, label: t(`rulesets.${id}`) }))}
          onChange={(rulesetId) => onTeamChange({ ...team, rulesetId })}
          aria-label={t("app.ruleset")}
          className="w-36 sm:w-40"
        />

        <div
          className="flex flex-wrap items-center gap-1.5"
          aria-label={t("app.rarityBudget")}
          title={t("app.rarityBudgetHint")}
        >
          <span
            className={cn(
              "border-2 px-1.5 py-0.5 font-display text-[11px] font-bold tracking-wide uppercase italic tnum",
              budget.heroOver
                ? "border-[var(--color-bad)] text-[var(--color-bad)]"
                : "border-ink-700 text-ink-300",
            )}
          >
            {t("app.heroBudget", { n: budget.heroes, max: budget.maxHeroes })}
          </span>
          <span
            className={cn(
              "border-2 px-1.5 py-0.5 font-display text-[11px] font-bold tracking-wide uppercase italic tnum",
              budget.basaraOver
                ? "border-[var(--color-bad)] text-[var(--color-bad)]"
                : "border-ink-700 text-ink-300",
            )}
          >
            {t("app.basaraBudget", { n: budget.basaras, max: budget.maxBasaras })}
          </span>
        </div>
      </div>

      {/* Actions — tools vs persistence */}
      <div className="flex flex-wrap items-center gap-2 border-t-2 border-ink-800 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          {onFillEmpty && (
            <Button
              onClick={onFillEmpty}
              disabled={emptyCount === 0}
              title={emptyCount === 0 ? t("app.fillEmptyNone") : t("app.fillEmptyHint")}
              icon={<WandSparkles className="size-4" />}
            >
              {t("app.fillEmpty")}
              {emptyCount > 0 && <CountBadge>{emptyCount}</CountBadge>}
            </Button>
          )}
          {onFillGear && (
            <Button
              onClick={onFillGear}
              disabled={emptyGear === 0}
              title={emptyGear === 0 ? t("app.fillGearNone") : t("app.fillGearHint")}
              icon={<Shirt className="size-4" />}
            >
              {t("app.fillGear")}
              {emptyGear > 0 && <CountBadge>{emptyGear}</CountBadge>}
            </Button>
          )}
          <Button
            variant="danger"
            onClick={onClear}
            disabled={!canClear}
            title={canClear ? t("app.clearTeamHint") : t("app.clearTeamNone")}
            icon={<Trash2 className="size-4" />}
          >
            {t("app.clearTeam")}
          </Button>
        </div>

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
    </div>
  );
}
