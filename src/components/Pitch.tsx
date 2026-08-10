import { AlertTriangle, Plus } from "lucide-react";

import type { Formation } from "@/domain/formations";
import type { SynergyResult } from "@/domain/synergy";
import type { ResolvedSlot, ResolvedTeam } from "@/domain/team";
import { POSITION_STYLE, cn, formatPercent, rarityLabel, rarityStyle } from "@/lib/ui";
import { ElementBadge } from "./ElementIcon";
import { PlayerAvatar } from "./PlayerAvatar";

interface Props {
  resolved: ResolvedTeam;
  synergy: SynergyResult;
  imageBase: string;
  selectedSlotId: string | null;
  onSelectSlot: (slotId: string) => void;
}

export function Pitch({ resolved, synergy, imageBase, selectedSlotId, onSelectSlot }: Props) {
  const bySlot = new Map(resolved.slots.map((slot) => [slot.slotId, slot]));

  return (
    <div className="flex flex-col gap-3">
      <FormationBoard
        formation={resolved.formation}
        bySlot={bySlot}
        synergy={synergy}
        imageBase={imageBase}
        selectedSlotId={selectedSlotId}
        onSelectSlot={onSelectSlot}
      />

      <SlotRow
        title="Remplaçants"
        slots={resolved.slots.filter((s) => s.kind === "bench")}
        imageBase={imageBase}
        selectedSlotId={selectedSlotId}
        onSelectSlot={onSelectSlot}
      />

      <SlotRow
        title="Staff"
        hint="Manager et coordinateurs n'ont pas de stats — seuls leurs passifs comptent."
        slots={resolved.slots.filter((s) => s.kind === "manager" || s.kind === "coordinator")}
        imageBase={imageBase}
        selectedSlotId={selectedSlotId}
        onSelectSlot={onSelectSlot}
      />
    </div>
  );
}

/** Card geometry — the board insets by half a card so none can hang off an edge. */
const CARD_WIDTH = 124;
const CARD_HEIGHT = 60;

/**
 * The formation, drawn as cards alone.
 *
 * There is no pitch: a green rectangle with chalk lines added nothing the cards
 * did not already say, and it forced them to sit inside a fixed aspect ratio
 * where the wide slots (x = 12.5 and 87.5 in 3-6-1 Hexa) hung over the edges.
 *
 * Instead the cards are positioned inside a box inset by half a card on every
 * side, so `x = 0` puts a card's *left edge* — not its centre — on the boundary.
 * The board keeps a min-width and scrolls itself on narrow screens rather than
 * letting the squad overlap or the page scroll sideways.
 */
function FormationBoard({
  formation,
  bySlot,
  synergy,
  imageBase,
  selectedSlotId,
  onSelectSlot,
}: {
  formation: Formation;
  bySlot: Map<string, ResolvedSlot>;
  synergy: SynergyResult;
  imageBase: string;
  selectedSlotId: string | null;
  onSelectSlot: (slotId: string) => void;
}) {
  return (
    <section className="panel overflow-hidden">
      <h2 className="panel-title">{formation.name}</h2>

      <div className="scroll-slim overflow-x-auto">
        <div
          className="relative mx-auto min-w-[680px]"
          style={{ height: 460 }}
        >
          <div
            className="absolute"
            style={{
              left: CARD_WIDTH / 2,
              right: CARD_WIDTH / 2,
              top: CARD_HEIGHT / 2 + 12,
              bottom: CARD_HEIGHT / 2 + 12,
            }}
          >
            {formation.slots.map((slot) => {
              const resolvedSlot = bySlot.get(slot.id);
              if (!resolvedSlot) return null;

              return (
                <div
                  key={slot.id}
                  className="absolute -translate-x-1/2 translate-y-1/2"
                  style={{ left: `${slot.x}%`, bottom: `${slot.y}%` }}
                >
                  <PitchSlot
                    slot={resolvedSlot}
                    synergy={synergy}
                    imageBase={imageBase}
                    selected={selectedSlotId === slot.id}
                    onSelect={() => onSelectSlot(slot.id)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function PitchSlot({
  slot,
  synergy,
  imageBase,
  selected,
  onSelect,
}: {
  slot: ResolvedSlot;
  synergy: SynergyResult;
  imageBase: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const boost = slotBoost(slot, synergy);

  if (!slot.player) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-label={`${slot.expectedPosition} — emplacement vide`}
        className={cn(
          "shear group flex h-[60px] w-[124px] flex-col items-center justify-center gap-1",
          "border-2 border-dashed border-white/30 bg-ink-950/25 transition",
          "hover:border-white/55 hover:bg-ink-950/40",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bolt-400",
          selected && "border-solid border-bolt-400 bg-ink-950/70",
        )}
      >
        <Plus className="shear-flat size-4 text-white/55 transition group-hover:text-white/85" />
        <span className="shear-flat font-display text-[12px] font-bold text-white/75 uppercase italic">
          {slot.expectedPosition}
        </span>
      </button>
    );
  }

  const rarity = rarityStyle(slot.rarity, slot.buildType);

  return (
    <button
      type="button"
      onClick={onSelect}
      title={`${slot.player.name} — ${rarityLabel(slot.rarity, slot.buildType)}`}
      aria-label={`${slot.expectedPosition} — ${slot.player.name}, ${rarityLabel(slot.rarity, slot.buildType)}`}
      className={cn(
        // Sheared parallelogram with a solid offset shadow — a manga panel, not
        // a rounded card. Rarity reads twice: the edge and the shadow colour.
        // Every child is counter-sheared so only the frame leans.
        "shear relative h-[60px] w-[124px] overflow-hidden border-2 bg-ink-950/90 text-left",
        "transition hover:brightness-125",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bolt-400",
        selected
          ? "border-bolt-400 shadow-[5px_6px_0_#7a6f00]"
          : cn(rarity.border, rarity.shadow),
      )}
    >
      <PlayerAvatar
        player={slot.player}
        imageBase={imageBase}
        width={58}
        height={58}
        ringClassName={null}
        className="shear-flat absolute top-0 -right-1 rounded-none"
      />

      <span className="shear-flat absolute top-1 left-2 flex flex-col gap-0.5">
        <ElementBadge element={slot.player.element} variant="kanji" size={17} />
        <span
          className={cn(
            "flex size-[17px] items-center justify-center border text-[9px] font-bold",
            POSITION_STYLE,
          )}
        >
          {slot.player.position}
        </span>
      </span>

      <span className="shear-flat absolute bottom-0.5 left-2 max-w-[60px] truncate font-display text-[12px] font-bold uppercase italic">
        {slot.player.nickname || slot.player.name}
      </span>

      {boost !== 0 && (
        <span
          className={cn(
            "shear-flat absolute right-1 bottom-0.5 px-1 text-[9px] font-bold tnum",
            boost > 0 ? "bg-[var(--color-good)] text-ink-950" : "bg-[var(--color-bad)] text-ink-950",
          )}
        >
          {formatPercent(boost)}
        </span>
      )}

      {!slot.positionMatch && (
        <span
          className="shear-flat absolute top-0.5 right-1 bg-bolt-400 p-0.5 text-ink-950"
          title={`Joueur ${slot.player.position} sur un poste ${slot.expectedPosition}`}
        >
          <AlertTriangle className="size-2.5" />
        </span>
      )}
    </button>
  );
}

function SlotRow({
  title,
  hint,
  slots,
  imageBase,
  selectedSlotId,
  onSelectSlot,
}: {
  title: string;
  hint?: string;
  slots: ResolvedSlot[];
  imageBase: string;
  selectedSlotId: string | null;
  onSelectSlot: (slotId: string) => void;
}) {
  return (
    <section className="panel overflow-hidden">
      <header className="panel-title flex items-baseline gap-2">
        <h2>{title}</h2>
        {hint && <p className="text-[11px] font-normal normal-case not-italic">{hint}</p>}
      </header>

      <div className="flex flex-wrap gap-3 p-3">
        {slots.map((slot) => (
          <SmallSlot
            key={slot.slotId}
            slot={slot}
            imageBase={imageBase}
            selected={selectedSlotId === slot.slotId}
            onSelect={() => onSelectSlot(slot.slotId)}
          />
        ))}
      </div>
    </section>
  );
}

function SmallSlot({
  slot,
  imageBase,
  selected,
  onSelect,
}: {
  slot: ResolvedSlot;
  imageBase: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const staffLabel =
    slot.kind === "manager"
      ? "Manager"
      : slot.kind === "coordinator"
        ? `Coord. ${slot.slotId.replace("coord", "")}`
        : `Banc ${slot.slotId.replace("bench", "")}`;

  const activePassives = slot.passives.length;
  const rarity = rarityStyle(slot.rarity, slot.buildType);

  if (!slot.player) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-label={`${staffLabel} — vide`}
        className={cn(
          "shear flex h-[60px] w-[124px] flex-col items-center justify-center gap-1",
          "border-2 border-dashed border-ink-800 bg-ink-850/50 transition-colors",
          "hover:border-ink-700 hover:bg-ink-850",
          selected && "border-solid border-bolt-400 bg-bolt-400/10",
        )}
      >
        <Plus className="shear-flat size-4 text-ink-500" />
        <span className="shear-flat font-display text-[12px] font-bold text-ink-500 uppercase italic">
          {staffLabel}
        </span>
      </button>
    );
  }

  // Same card as the pitch, so a squad reads the same wherever you look at it.
  return (
    <button
      type="button"
      onClick={onSelect}
      title={`${staffLabel} — ${slot.player.name}`}
      aria-label={`${staffLabel} — ${slot.player.name}`}
      className={cn(
        "shear relative h-[60px] w-[124px] overflow-hidden border-2 bg-ink-950/90 text-left",
        "transition hover:brightness-125",
        selected ? "border-bolt-400 shadow-[5px_6px_0_#7a6f00]" : cn(rarity.border, rarity.shadow),
      )}
    >
      <PlayerAvatar
        player={slot.player}
        imageBase={imageBase}
        width={58}
        height={58}
        ringClassName={null}
        className="shear-flat absolute top-0 -right-1 rounded-none"
      />

      <span className="shear-flat absolute top-1 left-2 flex flex-col gap-0.5">
        <ElementBadge element={slot.player.element} variant="kanji" size={17} />
        <span
          className={cn(
            "flex size-[17px] items-center justify-center border text-[9px] font-bold",
            POSITION_STYLE,
          )}
        >
          {slot.player.position}
        </span>
      </span>

      <span className="shear-flat absolute bottom-0.5 left-2 max-w-[60px] truncate font-display text-[12px] font-bold uppercase italic">
        {slot.player.nickname || slot.player.name}
      </span>

      {activePassives > 0 && (
        <span
          className="shear-flat absolute right-1 bottom-0.5 bg-ink-800 px-1 text-[9px] font-bold text-ink-300 tnum"
          title={`${activePassives} passif${activePassives > 1 ? "s" : ""}`}
        >
          {activePassives}P
        </span>
      )}
    </button>
  );
}

/**
 * A single headline number for the pitch: the average guaranteed modifier
 * across the six duel powers. KP is excluded — it is a goalkeeper scale an
 * order of magnitude larger and would swamp the average.
 */
function slotBoost(slot: ResolvedSlot, synergy: SynergyResult): number {
  const modifiers = synergy.power.get(slot.slotId);
  if (!modifiers) return 0;

  const keys = ["shootAT", "focusAT", "focusDF", "wallDF", "scrambleAT", "scrambleDF"] as const;
  const sum = keys.reduce((total, key) => total + modifiers[key].guaranteed, 0);
  return Math.round((sum / keys.length) * 10) / 10;
}
