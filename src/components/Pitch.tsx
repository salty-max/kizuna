import { AlertTriangle, Plus } from "lucide-react";

import type { Formation } from "@/domain/formations";
import { layoutPitchSlots } from "@/domain/layoutPitch";
import type { SynergyResult } from "@/domain/synergy";
import type { ResolvedSlot, ResolvedTeam } from "@/domain/team";
import { playerDisplayName, useI18n } from "@/i18n";
import { formationLabel, rarityDisplayLabel } from "@/i18n/labels";
import { cn, formatPercent, rarityStyle } from "@/lib/ui";
import { useMemo } from "react";
import { ElementBadge, PositionBadge, StaffIcon } from "./GameIcon";
import { PlayerAvatar } from "./PlayerAvatar";
import { Panel, PanelMeta } from "./ui";

interface Props {
  resolved: ResolvedTeam;
  synergy: SynergyResult;
  imageBase: string;
  selectedSlotId: string | null;
  onSelectSlot: (slotId: string) => void;
}

export function Pitch({ resolved, synergy, imageBase, selectedSlotId, onSelectSlot }: Props) {
  const { t } = useI18n();
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
        title={t("pitch.bench")}
        slots={resolved.slots.filter((s) => s.kind === "bench")}
        imageBase={imageBase}
        selectedSlotId={selectedSlotId}
        onSelectSlot={onSelectSlot}
      />

      <SlotRow
        title={t("pitch.staff")}
        hint={t("pitch.staffHint")}
        slots={resolved.slots.filter((s) => s.kind === "coach" || s.kind === "manager")}
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
/** Board size in px. Official coords pack denser than these cards; layoutPitchSlots
 *  spreads collisions, and a slightly larger board keeps nudges small. */
const BOARD_MIN_WIDTH = 720;
const BOARD_HEIGHT = 500;
const BOARD_PAD_Y_EXTRA = 12;

/**
 * The formation, drawn as cards alone.
 *
 * There is no pitch: a green rectangle with chalk lines added nothing the cards
 * did not already say, and it forced them to sit inside a fixed aspect ratio
 * where the wide slots (x = 12.5 and 87.5 in 3-6-1 Hexa) hung over the edges.
 *
 * Instead the cards are positioned inside a box inset by half a card on every
 * side, so `x = 0` puts a card's *left edge* — not its centre — on the boundary.
 * Official Victory Road markers sit too close for 124×60 sheared cards, so
 * coordinates go through `layoutPitchSlots` before paint. The board keeps a
 * min-width and scrolls itself on narrow screens rather than letting the squad
 * overlap or the page scroll sideways.
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
  const playableW = BOARD_MIN_WIDTH - CARD_WIDTH;
  const playableH = BOARD_HEIGHT - CARD_HEIGHT - BOARD_PAD_Y_EXTRA * 2;

  const laidOut = useMemo(
    () =>
      layoutPitchSlots(formation.slots, {
        playableW,
        playableH,
        cardW: CARD_WIDTH,
        cardH: CARD_HEIGHT,
      }),
    [formation.slots, playableW, playableH],
  );

  const positionById = useMemo(() => new Map(laidOut.map((s) => [s.id, s])), [laidOut]);
  const { t } = useI18n();

  return (
    <Panel title={formationLabel(t, formation)} padded={false}>
      <div className="scroll-slim overflow-x-auto">
        <div
          className="relative mx-auto"
          style={{ minWidth: BOARD_MIN_WIDTH, height: BOARD_HEIGHT }}
        >
          <div
            className="absolute"
            style={{
              left: CARD_WIDTH / 2,
              right: CARD_WIDTH / 2,
              top: CARD_HEIGHT / 2 + BOARD_PAD_Y_EXTRA,
              bottom: CARD_HEIGHT / 2 + BOARD_PAD_Y_EXTRA,
            }}
          >
            {formation.slots.map((slot) => {
              const resolvedSlot = bySlot.get(slot.id);
              if (!resolvedSlot) return null;
              const pos = positionById.get(slot.id) ?? slot;

              return (
                <div
                  key={slot.id}
                  className="absolute -translate-x-1/2 translate-y-1/2"
                  style={{ left: `${pos.x}%`, bottom: `${pos.y}%` }}
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
    </Panel>
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
  const { t, locale, showOriginalNames } = useI18n();
  const boost = slotBoost(slot, synergy);
  const displayName = playerDisplayName(slot.player, showOriginalNames, locale);

  if (!slot.player) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-label={`${slot.expectedPosition} — ${t("pitch.empty")}`}
        className={cn(
          "shear pressable group flex h-[60px] w-[124px] flex-col items-center justify-center gap-1",
          "border-2 border-dashed border-ink-700 bg-ink-950/60 transition",
          "hover:border-ink-500 hover:bg-ink-900",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bolt-400",
          selected && "border-solid border-bolt-400 bg-ink-900 tone-bolt",
        )}
      >
        {slot.expectedPosition ? (
          <PositionBadge
            position={slot.expectedPosition}
            variant="badge"
            size={18}
            className="shear-flat opacity-45 transition group-hover:opacity-90"
          />
        ) : (
          <Plus className="shear-flat size-4 text-ink-500 transition group-hover:text-ink-300" />
        )}
        <span className="shear-flat font-display text-[11px] font-bold text-ink-500 uppercase italic group-hover:text-ink-300">
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
      title={`${displayName} — ${rarityDisplayLabel(t, slot.rarity, slot.buildType)}`}
      aria-label={`${slot.expectedPosition} — ${displayName}, ${rarityDisplayLabel(t, slot.rarity, slot.buildType)}`}
      className={cn(
        // Sheared parallelogram with a solid offset shadow — a manga panel, not
        // a rounded card. Rarity reads twice: the edge and the shadow colour.
        // Every child is counter-sheared so only the frame leans.
        "shear pressable relative h-[60px] w-[124px] overflow-hidden border-2 bg-ink-950/90 text-left",
        "hover:brightness-125",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bolt-400",
        selected ? "border-bolt-400 tone-bolt" : cn(rarity.border, rarity.shadow),
      )}
    >
      <PlayerAvatar
        player={slot.player}
        imageBase={imageBase}
        displayName={displayName}
        width={58}
        height={58}
        ringClassName={null}
        className="shear-flat absolute top-0 -right-1 rounded-none"
      />

      <span className="shear-flat absolute top-1 left-2 flex flex-col items-start gap-0.5">
        <ElementBadge element={slot.player.element} variant="icon" size={16} />
        <PositionBadge position={slot.player.position} variant="badge" size={13} />
      </span>

      <span className="shear-flat absolute bottom-0.5 left-2 max-w-[60px] truncate font-display text-[12px] font-bold uppercase italic">
        {displayName}
      </span>

      {boost !== 0 && (
        <span
          className={cn(
            "shear-flat absolute right-1 bottom-0.5 border border-ink-950 px-1 font-display text-[9px] font-bold tnum",
            boost > 0
              ? "bg-[var(--color-good)] text-ink-950"
              : "bg-[var(--color-bad)] text-ink-950",
          )}
        >
          {formatPercent(boost, locale)}
        </span>
      )}

      {!slot.positionMatch && (
        <span
          className="shear-flat absolute top-0.5 right-1 bg-bolt-400 p-0.5 text-ink-950"
          title={t("pitch.outOfPositionTitle", {
            player: slot.player.position,
            expected: slot.expectedPosition ?? "",
          })}
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
    <Panel
      title={title}
      action={hint ? <PanelMeta>{hint}</PanelMeta> : undefined}
      bodyClassName="flex flex-wrap gap-3"
    >
      {slots.map((slot) => (
        <SmallSlot
          key={slot.slotId}
          slot={slot}
          imageBase={imageBase}
          selected={selectedSlotId === slot.slotId}
          onSelect={() => onSelectSlot(slot.slotId)}
        />
      ))}
    </Panel>
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
  const { t, locale, showOriginalNames } = useI18n();
  const staffLabel =
    slot.kind === "coach"
      ? t("pitch.coach")
      : slot.kind === "manager"
        ? t("pitch.manager", { n: slot.slotId.replace("manager", "") })
        : t("pitch.benchSlot", { n: slot.slotId.replace("bench", "") });

  const activePassives = slot.passives.length;
  const rarity = rarityStyle(slot.rarity, slot.buildType);
  const displayName = playerDisplayName(slot.player, showOriginalNames, locale);
  const isStaff = slot.kind === "coach" || slot.kind === "manager";
  // Coach / managers are passives-first in the dataset (no separate staff
  // roster). A slot with passives is "filled" even without a portrait.
  const staffConfigured = isStaff && activePassives > 0 && !slot.player;

  if (!slot.player && !staffConfigured) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-label={`${staffLabel} — ${t("pitch.empty")}`}
        className={cn(
          "shear flex h-[60px] w-[124px] flex-col items-center justify-center gap-1",
          "border-2 border-dashed border-ink-800 bg-ink-850/50 transition-colors",
          "hover:border-ink-700 hover:bg-ink-850",
          selected && "border-solid border-bolt-400 bg-bolt-400/10",
        )}
      >
        {slot.kind === "coach" ? (
          <StaffIcon kind="coach" size={22} className="shear-flat opacity-50" />
        ) : slot.kind === "manager" ? (
          <StaffIcon kind="manager" size={22} className="shear-flat opacity-50" />
        ) : (
          <Plus className="shear-flat size-4 text-ink-500" />
        )}
        <span className="shear-flat font-display text-[12px] font-bold text-ink-500 uppercase italic">
          {staffLabel}
        </span>
      </button>
    );
  }

  if (staffConfigured) {
    return (
      <button
        type="button"
        onClick={onSelect}
        title={`${staffLabel} — ${t("pitch.passivesCount", { n: activePassives })}`}
        aria-label={`${staffLabel} — ${t("pitch.passivesCount", { n: activePassives })}`}
        className={cn(
          "shear pressable relative flex h-[60px] w-[124px] flex-col items-start justify-between border-2 bg-ink-950/90 px-2 py-1.5 text-left",
          "hover:brightness-125",
          selected ? "border-bolt-400 tone-bolt" : "border-ink-700",
        )}
      >
        <span className="shear-flat flex items-center gap-1">
          <StaffIcon kind={slot.kind === "coach" ? "coach" : "manager"} size={16} />
          <span className="font-display text-[11px] font-bold text-ink-300 uppercase italic">
            {staffLabel}
          </span>
        </span>
        <span className="shear-flat border border-ink-700 bg-ink-800 px-1 font-display text-[9px] font-bold text-ink-300 tnum">
          {activePassives}P
        </span>
      </button>
    );
  }

  const player = slot.player;
  if (!player) return null;

  // Same card as the pitch, so a squad reads the same wherever you look at it.
  return (
    <button
      type="button"
      onClick={onSelect}
      title={`${staffLabel} — ${displayName}`}
      aria-label={`${staffLabel} — ${displayName}`}
      className={cn(
        "shear pressable relative h-[60px] w-[124px] overflow-hidden border-2 bg-ink-950/90 text-left",
        "hover:brightness-125",
        selected ? "border-bolt-400 tone-bolt" : cn(rarity.border, rarity.shadow),
      )}
    >
      <PlayerAvatar
        player={player}
        imageBase={imageBase}
        displayName={displayName}
        width={58}
        height={58}
        ringClassName={null}
        className="shear-flat absolute top-0 -right-1 rounded-none"
      />

      <span className="shear-flat absolute top-1 left-2 flex flex-col items-start gap-0.5">
        <ElementBadge element={player.element} variant="icon" size={16} />
        {slot.kind === "coach" ? (
          <StaffIcon kind="coach" size={14} />
        ) : slot.kind === "manager" ? (
          <StaffIcon kind="manager" size={14} />
        ) : (
          <PositionBadge position={player.position} variant="badge" size={13} />
        )}
      </span>

      <span className="shear-flat absolute bottom-0.5 left-2 max-w-[60px] truncate font-display text-[12px] font-bold uppercase italic">
        {displayName}
      </span>

      {activePassives > 0 && (
        <span
          className="shear-flat absolute right-1 bottom-0.5 border border-ink-700 bg-ink-800 px-1 font-display text-[9px] font-bold text-ink-300 tnum"
          title={t("pitch.passivesCount", { n: activePassives })}
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
