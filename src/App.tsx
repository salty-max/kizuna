import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, FolderOpen, Save, Trash2 } from "lucide-react";

import { Pitch } from "@/components/Pitch";
import { PlayerPicker } from "@/components/PlayerPicker";
import { SlotEditor } from "@/components/SlotEditor";
import { SynergyPanel } from "@/components/SynergyPanel";
import { loadDataset } from "@/data/load";
import { FORMATIONS } from "@/domain/formations";
import { computeSynergy } from "@/domain/synergy";
import {
  applyFormation,
  createTeam,
  emptyAssignment,
  resolveTeam,
  type SlotAssignment,
  type Team,
} from "@/domain/team";
import type { Dataset } from "@/domain/types";
import { teamFromLocationHash, teamShareUrl, writeTeamToLocationHash } from "@/lib/share";
import {
  deleteSavedTeam,
  loadCurrentTeam,
  loadSavedTeams,
  restoreSavedTeam,
  saveCurrentTeam,
  saveTeam,
  type SavedTeam,
} from "@/lib/storage";
import { cn } from "@/lib/ui";

/** A shared link wins over the local draft — that is the point of opening one. */
function initialTeam(): Team {
  return teamFromLocationHash() ?? loadCurrentTeam() ?? createTeam();
}

export default function App() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [team, setTeam] = useState<Team>(initialTeam);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saved, setSaved] = useState<SavedTeam[]>(() => loadSavedTeams());
  const [savedOpen, setSavedOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadDataset().then(setDataset, (error: unknown) =>
      setLoadError(error instanceof Error ? error.message : String(error)),
    );
  }, []);

  // The URL is the source of truth for sharing, localStorage for coming back.
  useEffect(() => {
    writeTeamToLocationHash(team);
    saveCurrentTeam(team);
  }, [team]);

  const resolved = useMemo(
    () => (dataset ? resolveTeam(team, dataset) : null),
    [team, dataset],
  );
  const synergy = useMemo(() => (resolved ? computeSynergy(resolved) : null), [resolved]);

  const selectedSlot = resolved?.slots.find((slot) => slot.slotId === selectedSlotId) ?? null;

  const updateAssignment = useCallback(
    (slotId: string, next: SlotAssignment) => {
      setTeam((current) => ({ ...current, slots: { ...current.slots, [slotId]: next } }));
    },
    [],
  );

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(teamShareUrl(team));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the URL bar already holds the same link.
      window.prompt("Copie ce lien :", teamShareUrl(team));
    }
  };

  if (loadError) {
    return (
      <Centered>
        <p className="text-sm text-[var(--color-bad)]">Impossible de charger les données.</p>
        <p className="mt-1 text-xs text-ink-500">{loadError}</p>
        <p className="mt-3 text-xs text-ink-500">
          Lance <code className="rounded bg-ink-850 px-1">bun run data</code> pour régénérer{" "}
          <code className="rounded bg-ink-850 px-1">public/data/</code>.
        </p>
      </Centered>
    );
  }

  if (!dataset || !resolved || !synergy) {
    return (
      <Centered>
        <p className="text-sm text-ink-500">Chargement des données…</p>
      </Centered>
    );
  }

  return (
    // The shell owns the height; the two columns scroll on their own so the
    // pitch never leaves the screen while you work through a slot's passives.
    <div className="mx-auto flex h-dvh max-w-[1600px] flex-col gap-3 overflow-hidden p-4">
      <header className="panel flex shrink-0 flex-wrap items-center gap-2 p-3">
        <h1 className="mr-1 text-lg font-bold tracking-tight">
          Kizuna<span className="ml-1.5 text-xs font-normal text-ink-500">Victory Road</span>
        </h1>

        <input
          value={team.name}
          onChange={(event) => setTeam((current) => ({ ...current, name: event.target.value }))}
          className="field w-56"
          aria-label="Nom de l'équipe"
        />

        <select
          value={team.formationId}
          onChange={(event) =>
            setTeam((current) => applyFormation(current, event.target.value))
          }
          className="field"
          aria-label="Formation"
        >
          {FORMATIONS.map((formation) => (
            <option key={formation.id} value={formation.id}>
              {formation.name}
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setSavedOpen((open) => !open)}
              className="btn"
              aria-expanded={savedOpen}
            >
              <FolderOpen className="size-4" />
              Mes équipes
              {saved.length > 0 && (
                <span className="rounded bg-ink-800 px-1 text-[11px] tnum">{saved.length}</span>
              )}
            </button>

            {savedOpen && (
              <SavedTeamsMenu
                saved={saved}
                onClose={() => setSavedOpen(false)}
                onRestore={(entry) => {
                  const restored = restoreSavedTeam(entry);
                  if (restored) {
                    setTeam(restored);
                    setSelectedSlotId(null);
                  }
                  setSavedOpen(false);
                }}
                onDelete={(id) => setSaved(deleteSavedTeam(id))}
              />
            )}
          </div>

          <button type="button" onClick={() => setSaved(saveTeam(team))} className="btn">
            <Save className="size-4" />
            Enregistrer
          </button>

          <button type="button" onClick={handleShare} className="btn btn-primary">
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Lien copié" : "Partager"}
          </button>
        </div>
      </header>

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
          {/* Tabs stay put; only the panel below them scrolls. */}
          <div className="flex shrink-0 gap-1">
            <TabButton active={selectedSlot === null} onClick={() => setSelectedSlotId(null)}>
              Équipe
            </TabButton>
            <TabButton active={selectedSlot !== null} onClick={() => undefined} disabled={!selectedSlot}>
              {selectedSlot?.player?.nickname || selectedSlot?.player?.name || "Slot"}
            </TabButton>
          </div>

          <div className="scroll-slim min-h-0 flex-1 overflow-y-auto pr-1">
            {selectedSlot ? (
              <SlotEditor
                slot={selectedSlot}
                assignment={team.slots[selectedSlot.slotId] ?? emptyAssignment()}
                dataset={dataset}
                synergy={synergy}
                onChange={(next) => updateAssignment(selectedSlot.slotId, next)}
                onOpenPicker={() => setPickerOpen(true)}
              />
            ) : (
              <SynergyPanel resolved={resolved} synergy={synergy} />
            )}
          </div>
        </aside>
      </div>

      <footer className="shrink-0 text-center text-[11px] text-ink-500">
        Projet de fan, sans lien avec Level-5. Données issues du dump communautaire{" "}
        <a
          href="https://github.com/lluni/inazuma-eleven-vr-wiki"
          target="_blank"
          rel="noreferrer noopener"
          className="underline hover:text-ink-300"
        >
          lluni/inazuma-eleven-vr-wiki
        </a>
        , portraits servis via Inazugle.
      </footer>

      {pickerOpen && selectedSlot && (
        <PlayerPicker
          dataset={dataset}
          suggestedPosition={selectedSlot.expectedPosition}
          onPick={(player) => {
            updateAssignment(selectedSlot.slotId, {
              ...(team.slots[selectedSlot.slotId] ?? emptyAssignment()),
              playerId: player.id,
            });
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "min-w-0 flex-1 truncate rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-bolt-500/50 bg-bolt-500/15 text-bolt-400"
          : "border-ink-800 bg-ink-850 text-ink-500 hover:bg-ink-800 disabled:opacity-40 disabled:hover:bg-ink-850",
      )}
    >
      {children}
    </button>
  );
}

function SavedTeamsMenu({
  saved,
  onClose,
  onRestore,
  onDelete,
}: {
  saved: SavedTeam[];
  onClose: () => void;
  onRestore: (entry: SavedTeam) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="panel absolute top-full right-0 z-20 mt-1 max-h-80 w-72 overflow-y-auto p-1 shadow-xl scroll-slim">
        {saved.length === 0 ? (
          <p className="p-3 text-xs text-ink-500">Aucune équipe enregistrée.</p>
        ) : (
          saved.map((entry) => (
            <div key={entry.id} className="flex items-center gap-1 rounded-lg hover:bg-ink-850">
              <button
                type="button"
                onClick={() => onRestore(entry)}
                className="min-w-0 flex-1 px-2 py-1.5 text-left"
              >
                <span className="block truncate text-sm">{entry.name}</span>
                <span className="block text-[11px] text-ink-500">
                  {new Date(entry.savedAt).toLocaleString("fr-FR")}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onDelete(entry.id)}
                className="mr-1 rounded p-1.5 text-ink-500 hover:bg-ink-800 hover:text-[var(--color-bad)]"
                aria-label={`Supprimer ${entry.name}`}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center p-8">
      <div className="text-center">{children}</div>
    </div>
  );
}
