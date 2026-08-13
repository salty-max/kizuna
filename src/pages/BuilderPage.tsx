import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Trash2 } from "lucide-react";

import { ImportDialog, ShareDialog } from "@/components/ShareModals";
import { BuilderWelcome } from "@/components/BuilderWelcome";
import { ActionNotice, type ActionFeedback } from "@/components/ActionNotice";
import { OptimizationReportPanel } from "@/components/OptimizationReportPanel";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { TeamToolbar } from "@/components/TeamToolbar";
import { IconButton, Panel } from "@/components/ui";
import { Pitch } from "@/components/Pitch";
import { PlayerPicker } from "@/components/PlayerPicker";
import { SlotEditor } from "@/components/SlotEditor";
import { SlotSheet } from "@/components/SlotSheet";
import { SynergyPanel } from "@/components/SynergyPanel";
import { useDataset } from "@/data/useDataset";
import {
  fillBestEmptyEquipment,
  optimizeEmptySlots,
  type OptimizationReport,
} from "@/domain/fillBest";
import { computeSynergy } from "@/domain/synergy";
import {
  createTeam,
  clearTeamAssignments,
  emptyAssignment,
  filledAssignment,
  normalizeTeam,
  resolveTeam,
  type SlotAssignment,
  type Team,
} from "@/domain/team";
import { playerDisplayName, useI18n } from "@/i18n";
import {
  decodeShareInput,
  encodeShareCode,
  encodeTeam,
  teamFromLocationHash,
  teamShareUrl,
  writeTeamToLocationHash,
} from "@/lib/share";
import {
  deleteSavedTeam,
  loadCurrentTeam,
  loadSavedTeams,
  restoreSavedTeam,
  saveCurrentTeam,
  saveTeam,
  type SavedTeam,
} from "@/lib/storage";
import { cn, formatDateTime } from "@/lib/ui";

/** A shared link wins over the local draft — that is the point of opening one. */
function initialTeam(): Team {
  const loaded = teamFromLocationHash() ?? loadCurrentTeam();
  return loaded ? normalizeTeam(loaded) : createTeam();
}

/** Team builder — pitch, slot editor, share. Lives at `/`. */
export function BuilderPage() {
  const { t, locale, showOriginalNames } = useI18n();
  const dataset = useDataset();
  const [team, setTeam] = useState<Team>(initialTeam);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saved, setSaved] = useState<SavedTeam[]>(() => loadSavedTeams());
  const [savedOpen, setSavedOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);
  const feedbackId = useRef(0);
  const [optimization, setOptimization] = useState<{
    report: OptimizationReport;
    teamCode: string;
  } | null>(null);

  // Debounce hash + localStorage: typing a team name shouldn't rewrite history
  // 20×/s. 300ms is short enough that a hard refresh still keeps the draft.
  useEffect(() => {
    const handle = window.setTimeout(() => {
      writeTeamToLocationHash(team);
      saveCurrentTeam(team);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [team]);

  const resolved = useMemo(() => resolveTeam(team, dataset), [team, dataset]);
  const synergy = useMemo(() => computeSynergy(resolved), [resolved]);

  const selectedSlot = resolved.slots.find((slot) => slot.slotId === selectedSlotId) ?? null;
  const currentTeamCode = encodeTeam(team);
  const activeOptimization =
    optimization && optimization.teamCode === currentTeamCode ? optimization.report : null;
  const hasPlayers = resolved.slots.some(
    (slot) => (slot.kind === "pitch" || slot.kind === "bench") && slot.player !== null,
  );
  const notify = (tone: ActionFeedback["tone"], message: string) => {
    setFeedback({ id: ++feedbackId.current, tone, message });
  };
  const dismissFeedback = useCallback(() => setFeedback(null), []);

  const updateAssignment = useCallback((slotId: string, next: SlotAssignment) => {
    setTeam((current) => ({
      ...current,
      slots: { ...current.slots, [slotId]: next },
    }));
  }, []);

  const handleCopyCode = async () => {
    const code = encodeShareCode(team);
    try {
      await navigator.clipboard.writeText(code);
      setCopied("code");
      notify("success", t("app.codeCopied"));
      setTimeout(() => setCopied(null), 2000);
    } catch {
      window.prompt(t("app.copyCodePrompt"), code);
    }
  };

  const handleCopyLink = async () => {
    const url = teamShareUrl(team);
    try {
      await navigator.clipboard.writeText(url);
      setCopied("link");
      notify("success", t("app.linkCopied"));
      setTimeout(() => setCopied(null), 2000);
    } catch {
      window.prompt(t("app.copyLinkPrompt"), url);
    }
  };

  const handleImport = (raw: string): boolean => {
    const next = decodeShareInput(raw);
    if (!next) return false;
    setTeam(normalizeTeam(next));
    setSelectedSlotId(null);
    setImportOpen(false);
    notify("success", t("app.importSuccess", { name: next.name || t("team.defaultName") }));
    return true;
  };

  const handleSave = () => {
    const named = team.name.trim() === "" ? { ...team, name: t("team.defaultName") } : team;
    if (named !== team) setTeam(named);
    const result = saveTeam(named);
    if (result.persisted) {
      setSaved(result.value);
      notify("success", t("app.saveSuccess", { name: named.name }));
    } else {
      notify("error", t("app.saveFailed"));
    }
  };

  const handleOptimize = (source: Team) => {
    const result = optimizeEmptySlots(source, dataset);
    setTeam(result.team);
    setOptimization({ report: result.report, teamCode: encodeTeam(result.team) });
  };
  const closePicker = () => {
    const slotId = selectedSlotId;
    setPickerOpen(false);
    if (slotId) {
      window.requestAnimationFrame(() => {
        document.getElementById(`slot-player-action-${slotId}`)?.focus();
      });
    }
  };

  const closeSlotSheet = () => {
    const slotId = selectedSlotId;
    setSelectedSlotId(null);
    setPickerOpen(false);
    if (slotId) {
      window.requestAnimationFrame(() => {
        document.getElementById(`slot-player-action-${slotId}`)?.focus();
      });
    }
  };
  const renderWelcome = () => (
    <BuilderWelcome
      onGenerateExample={() =>
        handleOptimize(team.name.trim() ? team : { ...team, name: t("onboarding.sampleName") })
      }
      onStartManually={() => {
        const firstSlotId = resolved.formation.slots[0]?.id;
        if (!firstSlotId) return;
        setSelectedSlotId(firstSlotId);
        setPickerOpen(true);
      }}
    />
  );

  return (
    <>
      <TeamToolbar
        team={team}
        onTeamChange={setTeam}
        onFillEmpty={() => handleOptimize(team)}
        onFillGear={() => setTeam((current) => fillBestEmptyEquipment(current, dataset))}
        onClear={() => setClearOpen(true)}
        saved={saved}
        savedOpen={savedOpen}
        onSavedOpenChange={setSavedOpen}
        onSave={handleSave}
        onImport={() => setImportOpen(true)}
        onShare={() => {
          setShareOpen(true);
          setCopied(null);
        }}
        savedMenu={
          savedOpen ? (
            <SavedTeamsMenu
              saved={saved}
              locale={locale}
              onClose={() => setSavedOpen(false)}
              onRestore={(entry) => {
                const restored = restoreSavedTeam(entry);
                if (restored) {
                  setTeam(normalizeTeam(restored));
                  setSelectedSlotId(null);
                  notify("success", t("app.restoreSuccess", { name: entry.name }));
                } else {
                  notify("error", t("app.restoreFailed"));
                }
                setSavedOpen(false);
              }}
              onDelete={(entry) => {
                const result = deleteSavedTeam(entry.id);
                if (result.persisted) {
                  setSaved(result.value);
                  notify("success", t("app.deleteSuccess", { name: entry.name }));
                } else {
                  notify("error", t("app.deleteFailed"));
                }
              }}
            />
          ) : null
        }
      />

      {!hasPlayers && <div className="lg:hidden">{renderWelcome()}</div>}

      {/* Pitch stays primary; team rail is always composition — never swapped for a slot tab. */}
      <div className="grid gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] lg:gap-4">
        <div className="min-h-0 min-w-0 lg:overflow-y-auto lg:scroll-slim">
          <Pitch
            resolved={resolved}
            synergy={synergy}
            imageBase={dataset.imageBase}
            selectedSlotId={selectedSlotId}
            onSelectSlot={setSelectedSlotId}
          />
        </div>

        <aside
          className={cn("flex min-h-0 min-w-0 flex-col gap-3", !hasPlayers && "hidden lg:flex")}
        >
          <div className="min-h-0 lg:flex-1 lg:overflow-y-auto lg:scroll-slim">
            {hasPlayers ? (
              <div className="flex flex-col gap-4">
                {activeOptimization && (
                  <OptimizationReportPanel
                    report={activeOptimization}
                    dataset={dataset}
                    onDismiss={() => setOptimization(null)}
                  />
                )}
                <SynergyPanel
                  resolved={resolved}
                  synergy={synergy}
                  dataset={dataset}
                  tacticIds={team.tacticIds}
                  onTacticsChange={(tacticIds) => setTeam((current) => ({ ...current, tacticIds }))}
                  offensiveSynergyId={team.offensiveSynergyId}
                  defensiveSynergyId={team.defensiveSynergyId}
                  onSynergiesChange={(ids) => setTeam((current) => ({ ...current, ...ids }))}
                  teamBuildType={team.teamBuildType}
                  buildRank={team.buildRank}
                  onBuildRankChange={(next) => setTeam((current) => ({ ...current, ...next }))}
                />
              </div>
            ) : (
              renderWelcome()
            )}
          </div>
        </aside>
      </div>

      {selectedSlot && !pickerOpen && (
        <SlotSheet
          title={
            selectedSlot.player
              ? playerDisplayName(selectedSlot.player, showOriginalNames, locale)
              : t("app.tabSlot")
          }
          subtitle={
            selectedSlot.expectedPosition
              ? `${selectedSlot.expectedPosition}${
                  selectedSlot.player && !selectedSlot.positionMatch
                    ? ` · ${selectedSlot.player.position}`
                    : ""
                }`
              : selectedSlot.kind === "coach"
                ? t("pitch.coach")
                : selectedSlot.kind === "manager"
                  ? t("pitch.managerRole")
                  : selectedSlot.kind === "bench"
                    ? t("pitch.bench")
                    : null
          }
          onClose={closeSlotSheet}
        >
          <SlotEditor
            slot={selectedSlot}
            assignment={team.slots[selectedSlot.slotId] ?? emptyAssignment()}
            team={team}
            dataset={dataset}
            synergy={synergy}
            onChange={(next) => updateAssignment(selectedSlot.slotId, next)}
            onOpenPicker={() => setPickerOpen(true)}
          />
        </SlotSheet>
      )}

      {pickerOpen && selectedSlot && (
        <PlayerPicker
          dataset={dataset}
          suggestedPosition={selectedSlot.expectedPosition}
          onPick={(player) => {
            const previous = team.slots[selectedSlot.slotId] ?? emptyAssignment();
            // Fresh pick → Legendary competitive floor; keep gear/passives if
            // the user is swapping portraits on an already-built slot.
            updateAssignment(
              selectedSlot.slotId,
              filledAssignment(player.id, {
                equipment: previous.equipment,
                passives: previous.passives,
                altBranch: previous.altBranch,
                buildType: previous.buildType ?? player.buildType,
                // Keep rarity only when re-picking on a slot that already had
                // someone; brand-new slots get Legendary via filledAssignment.
                rarity: previous.playerId != null ? previous.rarity : undefined,
              }),
            );
            closePicker();
          }}
          onClose={closePicker}
        />
      )}

      {shareOpen && (
        <ShareDialog
          code={encodeShareCode(team)}
          copied={copied}
          onCopyCode={handleCopyCode}
          onCopyLink={handleCopyLink}
          onClose={() => setShareOpen(false)}
        />
      )}

      {importOpen && <ImportDialog onImport={handleImport} onClose={() => setImportOpen(false)} />}
      {clearOpen && (
        <ConfirmDialog
          title={t("app.clearTeamTitle")}
          description={t("app.clearTeamDescription")}
          confirmLabel={t("app.clearTeamConfirm")}
          cancelLabel={t("app.cancel")}
          onClose={() => setClearOpen(false)}
          onConfirm={() => {
            setTeam((current) => clearTeamAssignments(current));
            setSelectedSlotId(null);
            setPickerOpen(false);
            setOptimization(null);
            setClearOpen(false);
            notify("success", t("app.clearTeamSuccess"));
          }}
        />
      )}
      {feedback && (
        <ActionNotice key={feedback.id} feedback={feedback} onDismiss={dismissFeedback} />
      )}
    </>
  );
}

function SavedTeamsMenu({
  saved,
  locale,
  onClose,
  onRestore,
  onDelete,
}: {
  saved: SavedTeam[];
  locale: import("@/i18n").Locale;
  onClose: () => void;
  onRestore: (entry: SavedTeam) => void;
  onDelete: (entry: SavedTeam) => void;
}) {
  const { t } = useI18n();

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <Panel
        padded={false}
        className="absolute top-full right-0 z-20 mt-2 max-h-80 w-72 overflow-y-auto scroll-slim"
      >
        {saved.length === 0 ? (
          <p className="p-3 text-xs text-ink-500">{t("app.noSavedTeams")}</p>
        ) : (
          saved.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-1 border-b border-ink-800 last:border-0 hover:bg-ink-850"
            >
              <button
                type="button"
                onClick={() => onRestore(entry)}
                className="min-w-0 flex-1 px-3 py-2 text-left"
              >
                <span className="block truncate font-display text-sm font-bold uppercase italic">
                  {entry.name || t("team.defaultName")}
                </span>
                <span className="block text-[11px] text-ink-500">
                  {formatDateTime(entry.savedAt, locale)}
                </span>
              </button>
              <IconButton
                tone="danger"
                onClick={() => onDelete(entry)}
                className="mr-2 border-transparent bg-transparent"
                aria-label={t("app.deleteTeam", {
                  name: entry.name || t("team.defaultName"),
                })}
              >
                <Trash2 className="size-3.5" />
              </IconButton>
            </div>
          ))
        )}
      </Panel>
    </>
  );
}
