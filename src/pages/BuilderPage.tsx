import { useCallback, useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";

import { ImportDialog, ShareDialog } from "@/components/ShareModals";
import { TeamToolbar } from "@/components/TeamToolbar";
import { IconButton, Panel, Tab } from "@/components/ui";
import { Pitch } from "@/components/Pitch";
import { PlayerPicker } from "@/components/PlayerPicker";
import { SlotEditor } from "@/components/SlotEditor";
import { SynergyPanel } from "@/components/SynergyPanel";
import { useDataset } from "@/data/useDataset";
import { fillBestEmptySlots } from "@/domain/fillBest";
import { computeSynergy } from "@/domain/synergy";
import {
  createTeam,
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
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

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
    return true;
  };

  const handleSave = () => {
    const named = team.name.trim() === "" ? { ...team, name: t("team.defaultName") } : team;
    if (named !== team) setTeam(named);
    setSaved(saveTeam(named));
  };

  return (
    <>
      <TeamToolbar
        team={team}
        onTeamChange={setTeam}
        onFillEmpty={() => setTeam((current) => fillBestEmptySlots(current, dataset))}
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
                }
                setSavedOpen(false);
              }}
              onDelete={(id) => setSaved(deleteSavedTeam(id))}
            />
          ) : null
        }
      />

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="scroll-slim min-h-0 overflow-y-auto pr-1">
          <Pitch
            resolved={resolved}
            synergy={synergy}
            imageBase={dataset.imageBase}
            selectedSlotId={selectedSlotId}
            onSelectSlot={setSelectedSlotId}
          />
        </div>

        <aside className="flex min-h-0 min-w-0 flex-col gap-3">
          <div role="tablist" className="flex shrink-0 gap-1">
            <Tab active={selectedSlot === null} onClick={() => setSelectedSlotId(null)}>
              {t("app.tabTeam")}
            </Tab>
            <Tab active={selectedSlot !== null} disabled={!selectedSlot}>
              {selectedSlot?.player
                ? playerDisplayName(selectedSlot.player, showOriginalNames, locale)
                : t("app.tabSlot")}
            </Tab>
          </div>

          <div className="scroll-slim min-h-0 flex-1 overflow-y-auto pr-1">
            {selectedSlot ? (
              <SlotEditor
                slot={selectedSlot}
                assignment={team.slots[selectedSlot.slotId] ?? emptyAssignment()}
                team={team}
                dataset={dataset}
                synergy={synergy}
                onChange={(next) => updateAssignment(selectedSlot.slotId, next)}
                onOpenPicker={() => setPickerOpen(true)}
              />
            ) : (
              <SynergyPanel
                resolved={resolved}
                synergy={synergy}
                dataset={dataset}
                tacticIds={team.tacticIds}
                onTacticsChange={(tacticIds) => setTeam((current) => ({ ...current, tacticIds }))}
              />
            )}
          </div>
        </aside>
      </div>

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
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
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
  onDelete: (id: string) => void;
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
                onClick={() => onDelete(entry.id)}
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
