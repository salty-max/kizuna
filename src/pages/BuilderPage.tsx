import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Trash2 } from "lucide-react";

import {
  deleteCloudTeam,
  listCloudTeams,
  restoreCloudTeam,
  saveCloudTeam,
  type CloudTeam,
} from "@/backend/cloudTeams";
import { useAuth } from "@/backend/useAuth";
import { ImportDialog, ShareDialog } from "@/components/ShareModals";
import { BuilderWelcome } from "@/components/BuilderWelcome";
import { ActionNotice, type ActionFeedback } from "@/components/ActionNotice";
import { OptimizationReportPanel } from "@/components/OptimizationReportPanel";
import { TeamGenerationWizard } from "@/components/TeamGenerationWizard";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { TeamToolbar } from "@/components/TeamToolbar";
import { IconButton, Panel } from "@/components/ui";
import { Pitch } from "@/components/Pitch";
import { PlayerPicker } from "@/components/PlayerPicker";
import { SlotEditor } from "@/components/SlotEditor";
import { SlotSheet } from "@/components/SlotSheet";
import { SynergyPanel } from "@/components/SynergyPanel";
import { useDataset } from "@/data/useDataset";
import { fillBestEmptyEquipment, type OptimizationReport } from "@/domain/fillBest";
import type { GeneratedTeamCandidate } from "@/domain/teamGenerator";
import { computeSynergy } from "@/domain/synergy";
import {
  createTeam,
  clearTeamAssignments,
  emptyAssignment,
  filledAssignment,
  moveSlotAssignment,
  normalizeTeam,
  resolveTeam,
  updateSlotAssignment,
  type SlotAssignment,
  type Team,
} from "@/domain/team";
import { createTeamHistory, teamHistoryReducer } from "@/domain/teamHistory";
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
import { formatDateTime } from "@/lib/ui";
import { downloadTeamPoster } from "@/lib/teamPoster";

/** A shared link wins over the local draft — that is the point of opening one. */
function initialTeam(): Team {
  const loaded = teamFromLocationHash() ?? loadCurrentTeam();
  return loaded ? normalizeTeam(loaded) : createTeam();
}

/** Team builder — pitch, slot editor, share. Lives at `/`. */
export function BuilderPage() {
  const { t, locale, showOriginalNames } = useI18n();
  const { user } = useAuth();
  const dataset = useDataset();
  const [history, dispatchHistory] = useReducer(teamHistoryReducer, null, () =>
    createTeamHistory(initialTeam()),
  );
  const team = history.present;
  const setTeam = useCallback<Dispatch<SetStateAction<Team>>>((update) => {
    dispatchHistory({ type: "update", update, at: Date.now() });
  }, []);
  const undoTeam = useCallback(() => dispatchHistory({ type: "undo" }), []);
  const redoTeam = useCallback(() => dispatchHistory({ type: "redo" }), []);
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerOrigin, setPickerOrigin] = useState<"slot" | "editor" | null>(null);
  const [saved, setSaved] = useState<SavedTeam[]>(() => loadSavedTeams());
  const [cloudTeams, setCloudTeams] = useState<CloudTeam[]>([]);
  const [savedOpen, setSavedOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [exporting, setExporting] = useState(false);
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);
  const feedbackId = useRef(0);
  const [optimization, setOptimization] = useState<{
    report: OptimizationReport;
    teamCode: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    if (!user) {
      setCloudTeams([]);
      return;
    }
    void listCloudTeams()
      .then((entries) => {
        if (active) setCloudTeams(entries);
      })
      .catch(() => {
        if (active) notify("error", t("cloud.loadFailed"));
      });
    return () => {
      active = false;
    };
  }, [t, user]);

  // Debounce hash + localStorage: typing a team name shouldn't rewrite history
  // 20×/s. 300ms is short enough that a hard refresh still keeps the draft.
  useEffect(() => {
    const handle = window.setTimeout(() => {
      writeTeamToLocationHash(team);
      saveCurrentTeam(team);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [team]);

  useEffect(() => {
    const handleHistoryShortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
      ) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "z" && event.shiftKey && canRedo) {
        event.preventDefault();
        redoTeam();
      } else if (key === "z" && canUndo) {
        event.preventDefault();
        undoTeam();
      } else if (key === "y" && canRedo) {
        event.preventDefault();
        redoTeam();
      }
    };
    window.addEventListener("keydown", handleHistoryShortcut);
    return () => window.removeEventListener("keydown", handleHistoryShortcut);
  }, [canRedo, canUndo, redoTeam, undoTeam]);

  const resolved = useMemo(() => resolveTeam(team, dataset), [team, dataset]);
  const synergy = useMemo(() => computeSynergy(resolved), [resolved]);

  const selectedSlot = resolved.slots.find((slot) => slot.slotId === selectedSlotId) ?? null;
  const selectedSlotHasEditor = Boolean(
    selectedSlot?.player ||
    (selectedSlot &&
      (selectedSlot.kind === "coach" || selectedSlot.kind === "manager") &&
      selectedSlot.passives.length > 0),
  );
  const currentTeamCode = encodeTeam(team);
  const activeOptimization =
    optimization && optimization.teamCode === currentTeamCode ? optimization.report : null;
  const hasPlayers = resolved.slots.some(
    (slot) => (slot.kind === "pitch" || slot.kind === "bench") && slot.player !== null,
  );
  const analysisScrollRef = useRef<HTMLDivElement>(null);

  // The empty-state CTA can scroll the analysis rail before opening the
  // generator. A generated squad replaces that content in place, so restore
  // the match-day summary to the top instead of inheriting the old position.
  useEffect(() => {
    analysisScrollRef.current?.scrollTo({ top: 0 });
  }, [hasPlayers, activeOptimization]);

  const notify = (tone: ActionFeedback["tone"], message: string) => {
    setFeedback({ id: ++feedbackId.current, tone, message });
  };
  const dismissFeedback = useCallback(() => setFeedback(null), []);

  const updateAssignment = useCallback(
    (slotId: string, next: SlotAssignment) => {
      setTeam((current) => updateSlotAssignment(current, slotId, next));
    },
    [setTeam],
  );

  const handleSelectSlot = (slotId: string) => {
    const slot = resolved.slots.find((entry) => entry.slotId === slotId);
    if (!slot) return;
    const hasEditor = Boolean(
      slot.player ||
      ((slot.kind === "coach" || slot.kind === "manager") && slot.passives.length > 0),
    );
    setSelectedSlotId(slotId);
    setPickerOrigin(hasEditor ? null : "slot");
    setPickerOpen(!hasEditor);
  };

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

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadTeamPoster(resolved, dataset.imageBase, locale, showOriginalNames);
      notify("success", t("app.exportImageSuccess"));
    } catch {
      notify("error", t("app.exportImageFailed"));
    } finally {
      setExporting(false);
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

  const handleSave = async () => {
    const named = team.name.trim() === "" ? { ...team, name: t("team.defaultName") } : team;
    if (named !== team) setTeam(named);
    const result = saveTeam(named);
    if (!result.persisted) {
      notify("error", t("app.saveFailed"));
      return;
    }
    setSaved(result.value);
    if (!user) {
      notify("success", t("app.saveSuccess", { name: named.name }));
      return;
    }
    try {
      await saveCloudTeam(named);
      setCloudTeams(await listCloudTeams());
      notify("success", t("cloud.saveSuccess", { name: named.name }));
    } catch {
      notify("error", t("cloud.saveFailedLocalKept"));
    }
  };

  const handleGeneratedTeam = (candidate: GeneratedTeamCandidate) => {
    const next = candidate.team.name.trim()
      ? candidate.team
      : { ...candidate.team, name: t("onboarding.sampleName") };
    setTeam(next);
    setOptimization({ report: candidate.report, teamCode: encodeTeam(next) });
    setSelectedSlotId(null);
    setGeneratorOpen(false);
    notify("success", t("generator.applied"));
  };
  const closePicker = () => {
    const slotId = selectedSlotId;
    const returnToEditor = pickerOrigin === "editor";
    setPickerOpen(false);
    setPickerOrigin(null);
    if (!returnToEditor) setSelectedSlotId(null);
    if (slotId) {
      window.requestAnimationFrame(() => {
        document
          .getElementById(returnToEditor ? `slot-player-action-${slotId}` : `team-slot-${slotId}`)
          ?.focus();
      });
    }
  };

  const closeSlotSheet = () => {
    const slotId = selectedSlotId;
    setSelectedSlotId(null);
    setPickerOpen(false);
    if (slotId) {
      window.requestAnimationFrame(() => {
        document.getElementById(`team-slot-${slotId}`)?.focus();
      });
    }
  };
  const renderWelcome = () => (
    <BuilderWelcome
      onGenerateExample={() => setGeneratorOpen(true)}
      onStartManually={() => {
        const firstSlotId = resolved.formation.slots[0]?.id;
        if (!firstSlotId) return;
        handleSelectSlot(firstSlotId);
      }}
    />
  );

  return (
    <>
      <TeamToolbar
        team={team}
        players={dataset.players}
        onTeamChange={setTeam}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undoTeam}
        onRedo={redoTeam}
        onFillEmpty={() => setGeneratorOpen(true)}
        onFillGear={() => setTeam((current) => fillBestEmptyEquipment(current, dataset))}
        onClear={() => setClearOpen(true)}
        savedCount={saved.length + cloudTeams.length}
        savedOpen={savedOpen}
        onSavedOpenChange={setSavedOpen}
        onSave={handleSave}
        onImport={() => setImportOpen(true)}
        onExport={handleExport}
        exporting={exporting}
        onShare={() => {
          setShareOpen(true);
          setCopied(null);
        }}
        savedMenu={
          savedOpen ? (
            <SavedTeamsMenu
              saved={saved}
              cloudTeams={cloudTeams}
              signedIn={Boolean(user)}
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
              onRestoreCloud={(entry) => {
                const restored = restoreCloudTeam(entry);
                if (restored) {
                  setTeam(normalizeTeam(restored));
                  setSelectedSlotId(null);
                  notify("success", t("cloud.restoreSuccess", { name: entry.name }));
                } else {
                  notify("error", t("app.restoreFailed"));
                }
                setSavedOpen(false);
              }}
              onDeleteCloud={async (entry) => {
                try {
                  await deleteCloudTeam(entry.id);
                  setCloudTeams((current) => current.filter((team) => team.id !== entry.id));
                  notify("success", t("cloud.deleteSuccess", { name: entry.name }));
                } catch {
                  notify("error", t("cloud.deleteFailed"));
                }
              }}
            />
          ) : null
        }
      />

      {!hasPlayers && <div className="xl:hidden">{renderWelcome()}</div>}

      <div className="cockpit-shell relative grid gap-3 p-2 xl:min-h-0 xl:flex-1 xl:grid-cols-[17rem_minmax(0,1fr)_19rem] xl:overflow-hidden">
        <aside
          className="cockpit-rail order-2 min-h-0 min-w-0 xl:order-1"
          aria-label={t("workspace.setup")}
        >
          <h2 className="cockpit-rail-title">{t("workspace.setup")}</h2>
          <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">
            <SynergyPanel
              mode="setup"
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
        </aside>

        <div className="order-1 min-h-0 min-w-0 xl:order-2 xl:overflow-y-auto xl:scroll-slim">
          <Pitch
            resolved={resolved}
            synergy={synergy}
            imageBase={dataset.imageBase}
            selectedSlotId={selectedSlotId}
            onSelectSlot={handleSelectSlot}
            onMoveSlot={(sourceSlotId, targetSlotId) =>
              setTeam((current) => moveSlotAssignment(current, sourceSlotId, targetSlotId))
            }
            onInvalidMove={() => notify("error", t("pitch.dragInvalid"))}
            variant="cockpit"
          />
        </div>

        <aside
          className="cockpit-rail order-3 min-h-0 min-w-0"
          aria-label={t("workspace.analysis")}
        >
          <h2 className="cockpit-rail-title">{t("workspace.analysis")}</h2>
          <div ref={analysisScrollRef} className="scroll-slim min-h-0 flex-1 overflow-y-auto">
            {hasPlayers ? (
              <div className="cockpit-stack flex flex-col">
                <SynergyPanel
                  mode="analysis"
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
                {activeOptimization && (
                  <OptimizationReportPanel
                    report={activeOptimization}
                    dataset={dataset}
                    onDismiss={() => setOptimization(null)}
                  />
                )}
              </div>
            ) : (
              <div className="hidden xl:block">{renderWelcome()}</div>
            )}
          </div>
        </aside>
      </div>

      {selectedSlot && selectedSlotHasEditor && !pickerOpen && (
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
            onOpenPicker={() => {
              setPickerOrigin("editor");
              setPickerOpen(true);
            }}
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
      {generatorOpen && (
        <TeamGenerationWizard
          team={team}
          dataset={dataset}
          onApply={handleGeneratedTeam}
          onClose={() => setGeneratorOpen(false)}
        />
      )}
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
  cloudTeams,
  signedIn,
  locale,
  onClose,
  onRestore,
  onDelete,
  onRestoreCloud,
  onDeleteCloud,
}: {
  saved: SavedTeam[];
  cloudTeams: CloudTeam[];
  signedIn: boolean;
  locale: import("@/i18n").Locale;
  onClose: () => void;
  onRestore: (entry: SavedTeam) => void;
  onDelete: (entry: SavedTeam) => void;
  onRestoreCloud: (entry: CloudTeam) => void;
  onDeleteCloud: (entry: CloudTeam) => void;
}) {
  const { t } = useI18n();

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <Panel
        padded={false}
        className="absolute top-full right-0 z-20 mt-2 max-h-80 w-72 overflow-y-auto scroll-slim"
      >
        {saved.length === 0 && cloudTeams.length === 0 ? (
          <p className="p-3 text-xs text-ink-500">{t("app.noSavedTeams")}</p>
        ) : (
          <>
            {signedIn && cloudTeams.length > 0 && (
              <p className="border-b border-ink-800 px-3 py-1.5 label-display text-bolt-400">
                {t("cloud.cloudSection")}
              </p>
            )}
            {cloudTeams.map((entry) => (
              <SavedTeamRow
                key={`cloud-${entry.id}`}
                name={entry.name}
                savedAt={entry.savedAt}
                locale={locale}
                onRestore={() => onRestoreCloud(entry)}
                onDelete={() => onDeleteCloud(entry)}
                deleteLabel={t("app.deleteTeam", { name: entry.name || t("team.defaultName") })}
              />
            ))}
            {saved.length > 0 && (
              <p className="border-y border-ink-800 px-3 py-1.5 label-display text-ink-500 first:border-t-0">
                {t("cloud.deviceSection")}
              </p>
            )}
            {saved.map((entry) => (
              <SavedTeamRow
                key={`local-${entry.id}`}
                name={entry.name}
                savedAt={entry.savedAt}
                locale={locale}
                onRestore={() => onRestore(entry)}
                onDelete={() => onDelete(entry)}
                deleteLabel={t("app.deleteTeam", {
                  name: entry.name || t("team.defaultName"),
                })}
              />
            ))}
          </>
        )}
      </Panel>
    </>
  );
}

function SavedTeamRow({
  name,
  savedAt,
  locale,
  onRestore,
  onDelete,
  deleteLabel,
}: {
  name: string;
  savedAt: string;
  locale: import("@/i18n").Locale;
  onRestore: () => void;
  onDelete: () => void;
  deleteLabel: string;
}) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-1 border-b border-ink-800 last:border-0 hover:bg-ink-850">
      <button type="button" onClick={onRestore} className="min-w-0 flex-1 px-3 py-2 text-left">
        <span className="block truncate font-display text-sm font-bold uppercase italic">
          {name || t("team.defaultName")}
        </span>
        <span className="block text-[11px] text-ink-500">{formatDateTime(savedAt, locale)}</span>
      </button>
      <IconButton
        tone="danger"
        onClick={onDelete}
        className="mr-2 border-transparent bg-transparent"
        aria-label={deleteLabel}
      >
        <Trash2 className="size-3.5" />
      </IconButton>
    </div>
  );
}
