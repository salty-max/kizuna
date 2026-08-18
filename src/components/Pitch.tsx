import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { AlertTriangle, Plus } from "lucide-react";
import { useCallback, useMemo, useState, type ButtonHTMLAttributes } from "react";

import type { Formation } from "@/domain/formations";
import { layoutPitchSlots } from "@/domain/layoutPitch";
import type { SynergyResult } from "@/domain/synergy";
import type { ResolvedSlot, ResolvedTeam } from "@/domain/team";
import { playerCardName, playerDisplayName, useI18n } from "@/i18n";
import { formationLabel, rarityDisplayLabel } from "@/i18n/labels";
import { cn, formatPercent, rarityStyle } from "@/lib/ui";
import { ElementBadge, PositionBadge, StaffIcon } from "./GameIcon";
import { PlayerAvatar } from "./PlayerAvatar";
import { Panel, PanelMeta } from "./ui";

interface Props {
  resolved: ResolvedTeam;
  synergy: SynergyResult;
  imageBase: string;
  selectedSlotId: string | null;
  onSelectSlot: (slotId: string) => void;
  onMoveSlot: (sourceSlotId: string, targetSlotId: string) => void;
  onInvalidMove: () => void;
  variant?: "stacked" | "cockpit";
}

export function Pitch({
  resolved,
  synergy,
  imageBase,
  selectedSlotId,
  onSelectSlot,
  onMoveSlot,
  onInvalidMove,
  variant = "stacked",
}: Props) {
  const { t, locale, showOriginalNames } = useI18n();
  const bySlot = useMemo(
    () => new Map(resolved.slots.map((slot) => [slot.slotId, slot])),
    [resolved.slots],
  );
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const activeSlot = activeSlotId ? bySlot.get(activeSlotId) : null;
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const describeSlot = useCallback(
    (slotId: string): string => {
      const slot = bySlot.get(slotId);
      if (!slot) return slotId;
      const name = playerDisplayName(slot.player, showOriginalNames, locale);
      if (slot.kind === "coach") return `${t("pitch.coach")} — ${name || t("pitch.empty")}`;
      if (slot.kind === "manager") {
        return `${t("pitch.manager", { n: slot.slotId.replace("manager", "") })} — ${name || t("pitch.empty")}`;
      }
      if (slot.kind === "bench") {
        return `${t("pitch.benchSlot", { n: slot.slotId.replace("bench", "") })} — ${name || t("pitch.empty")}`;
      }
      return `${slot.expectedPosition} — ${name || t("pitch.empty")}`;
    },
    [bySlot, locale, showOriginalNames, t],
  );
  const announcements = useMemo<Announcements>(
    () => ({
      onDragStart: ({ active }) =>
        t("pitch.dragStart", { source: describeSlot(String(active.id)) }),
      onDragOver: ({ over }) =>
        over ? t("pitch.dragOver", { target: describeSlot(String(over.id)) }) : undefined,
      onDragEnd: ({ active, over }) =>
        over
          ? canMoveBetweenKinds(
              bySlot.get(String(active.id))?.kind,
              bySlot.get(String(over.id))?.kind,
            )
            ? t("pitch.dragEnd", {
                source: describeSlot(String(active.id)),
                target: describeSlot(String(over.id)),
              })
            : t("pitch.dragInvalid")
          : t("pitch.dragCancel"),
      onDragCancel: () => t("pitch.dragCancel"),
    }),
    [bySlot, describeSlot, t],
  );

  const handleDragStart = ({ active }: DragStartEvent) => setActiveSlotId(String(active.id));
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveSlotId(null);
    if (!over || active.id === over.id) return;
    const sourceId = String(active.id);
    const targetId = String(over.id);
    if (!canMoveBetweenKinds(bySlot.get(sourceId)?.kind, bySlot.get(targetId)?.kind)) {
      onInvalidMove();
      return;
    }
    onMoveSlot(sourceId, targetId);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      accessibility={{
        announcements,
        screenReaderInstructions: { draggable: t("pitch.dragInstructions") },
      }}
      onDragStart={handleDragStart}
      onDragCancel={() => setActiveSlotId(null)}
      onDragEnd={handleDragEnd}
    >
      <div className="flex min-w-0 flex-col gap-3">
        <FormationBoard
          formation={resolved.formation}
          bySlot={bySlot}
          synergy={synergy}
          imageBase={imageBase}
          selectedSlotId={selectedSlotId}
          onSelectSlot={onSelectSlot}
          compact={variant === "cockpit"}
        />

        {variant === "cockpit" ? (
          <RosterStrip
            resolved={resolved}
            imageBase={imageBase}
            selectedSlotId={selectedSlotId}
            onSelectSlot={onSelectSlot}
          />
        ) : (
          <>
            <SlotRow
              title={t("pitch.bench")}
              slots={resolved.slots.filter((s) => s.kind === "bench")}
              imageBase={imageBase}
              selectedSlotId={selectedSlotId}
              onSelectSlot={onSelectSlot}
            />

            <SlotRow
              title={t("pitch.staff")}
              slots={resolved.slots.filter((s) => s.kind === "coach" || s.kind === "manager")}
              imageBase={imageBase}
              selectedSlotId={selectedSlotId}
              onSelectSlot={onSelectSlot}
            />
          </>
        )}
      </div>

      <DragOverlay dropAnimation={{ duration: 160, easing: "ease-out" }}>
        {activeSlot?.player ? <DragCardPreview slot={activeSlot} imageBase={imageBase} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

/** Card geometry — the board insets by half a card so none can hang off an edge. */
const CARD_WIDTH = 124;
const CARD_HEIGHT = 60;
/** Board size in px. Official coords pack denser than these cards; layoutPitchSlots
 *  spreads collisions, and a slightly larger board keeps nudges small. */
/** Slightly under 720 so pitch + ~22rem team rail fit more 1280–1440 viewports without dual scroll. */
const BOARD_MIN_WIDTH = 640;
const BOARD_HEIGHT = 480;
/** Smallest cockpit height that clears the 124×60 card AABBs in all formations. */
const COCKPIT_BOARD_HEIGHT = 420;
const BOARD_PAD_Y_EXTRA = 12;

function canMoveBetweenKinds(
  source: ResolvedSlot["kind"] | undefined,
  target: ResolvedSlot["kind"] | undefined,
) {
  if (!source || !target) return false;
  const group = (kind: ResolvedSlot["kind"]) =>
    kind === "pitch" || kind === "bench" ? "player" : kind;
  return group(source) === group(target);
}

function SlotButton({
  slot,
  className,
  children,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "slot"> & { slot: ResolvedSlot }) {
  const { t } = useI18n();
  const {
    attributes,
    listeners,
    isDragging,
    active,
    setNodeRef: setDraggableRef,
  } = useDraggable({
    id: slot.slotId,
    disabled: !slot.player || slot.kind === "coach",
    data: { slotKind: slot.kind },
    attributes: { roleDescription: t("pitch.draggableCard") },
  });
  const { isOver, setNodeRef: setDroppableRef } = useDroppable({ id: slot.slotId });
  const setNodeRef = useCallback(
    (node: HTMLButtonElement | null) => {
      setDraggableRef(node);
      setDroppableRef(node);
    },
    [setDraggableRef, setDroppableRef],
  );
  const draggable = Boolean(slot.player && slot.kind !== "coach");
  const activeKind = active?.data.current?.slotKind as ResolvedSlot["kind"] | undefined;
  const compatibleTarget = canMoveBetweenKinds(activeKind, slot.kind);
  const dragProps = draggable ? { ...attributes, ...listeners } : {};

  return (
    <button
      {...props}
      {...dragProps}
      ref={setNodeRef}
      id={`team-slot-${slot.slotId}`}
      type="button"
      data-slot-id={slot.slotId}
      data-dragging={isDragging ? "true" : undefined}
      data-drop-target={isOver && active?.id !== slot.slotId ? "true" : undefined}
      className={cn(
        className,
        draggable && "cursor-grab touch-manipulation active:cursor-grabbing",
        isDragging && "opacity-30",
        isOver &&
          active?.id !== slot.slotId &&
          (compatibleTarget
            ? "outline-2 outline-offset-2 outline-[var(--color-good)] brightness-150"
            : "outline-2 outline-offset-2 outline-[var(--color-bad)] saturate-50"),
      )}
    >
      {children}
    </button>
  );
}

function DragCardPreview({ slot, imageBase }: { slot: ResolvedSlot; imageBase: string }) {
  const { locale, showOriginalNames } = useI18n();
  const player = slot.player;
  if (!player) return null;
  const displayName = playerDisplayName(player, showOriginalNames, locale);
  const cardName = playerCardName(player, showOriginalNames, locale);
  const rarity = rarityStyle(slot.rarity, slot.buildType);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "shear relative h-[60px] w-[124px] cursor-grabbing overflow-hidden border-2 bg-ink-950 text-left shadow-2xl",
        rarity.border,
        rarity.shadow,
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
        <PositionBadge position={player.position} variant="badge" size={13} />
      </span>
      <span className="shear-flat absolute bottom-0.5 left-2 max-w-[60px] truncate font-display text-[12px] font-bold uppercase italic">
        {cardName}
      </span>
    </div>
  );
}

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
  compact = false,
}: {
  formation: Formation;
  bySlot: Map<string, ResolvedSlot>;
  synergy: SynergyResult;
  imageBase: string;
  selectedSlotId: string | null;
  onSelectSlot: (slotId: string) => void;
  compact?: boolean;
}) {
  const boardHeight = compact ? COCKPIT_BOARD_HEIGHT : BOARD_HEIGHT;
  const playableW = BOARD_MIN_WIDTH - CARD_WIDTH;
  const playableH = boardHeight - CARD_HEIGHT - BOARD_PAD_Y_EXTRA * 2;

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
    <Panel
      title={formationLabel(t, formation)}
      action={<PanelMeta>{t("pitch.dragHint")}</PanelMeta>}
      padded={false}
      className={compact ? "cockpit-pitch-panel" : undefined}
    >
      <div className="scroll-slim overflow-x-auto">
        <div
          className="relative mx-auto"
          style={{ minWidth: BOARD_MIN_WIDTH, height: boardHeight }}
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
  const cardName = playerCardName(slot.player, showOriginalNames, locale);

  if (!slot.player) {
    return (
      <SlotButton
        slot={slot}
        onClick={onSelect}
        aria-label={`${slot.expectedPosition} — ${t("pitch.empty")}`}
        className={cn(
          "shear pressable group flex h-[60px] w-[124px] flex-col items-center justify-center gap-1",
          "border-2 border-dashed border-ink-700 bg-ink-950/60 transition",
          "hover:border-ink-500 hover:bg-ink-900",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bolt-ink",
          selected && "border-solid border-bolt-ink bg-ink-900 tone-bolt",
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
      </SlotButton>
    );
  }

  const rarity = rarityStyle(slot.rarity, slot.buildType);

  return (
    <SlotButton
      slot={slot}
      onClick={onSelect}
      title={`${displayName} — ${rarityDisplayLabel(t, slot.rarity, slot.buildType)}`}
      aria-label={`${slot.expectedPosition} — ${displayName}, ${rarityDisplayLabel(t, slot.rarity, slot.buildType)}`}
      className={cn(
        // Sheared parallelogram with a solid offset shadow — a manga panel, not
        // a rounded card. Rarity reads twice: the edge and the shadow colour.
        // Every child is counter-sheared so only the frame leans.
        "shear pressable relative h-[60px] w-[124px] overflow-hidden border-2 bg-ink-950/90 text-left",
        "hover:brightness-125",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bolt-ink",
        selected ? "border-bolt-ink tone-bolt" : cn(rarity.border, rarity.shadow),
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
        {cardName}
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
    </SlotButton>
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

/** Bench and staff stay visible under the XI without consuming two full cards. */
function RosterStrip({
  resolved,
  imageBase,
  selectedSlotId,
  onSelectSlot,
}: {
  resolved: ResolvedTeam;
  imageBase: string;
  selectedSlotId: string | null;
  onSelectSlot: (slotId: string) => void;
}) {
  const { t } = useI18n();
  const groups = [
    { label: t("pitch.bench"), slots: resolved.slots.filter((slot) => slot.kind === "bench") },
    {
      label: t("pitch.staff"),
      slots: resolved.slots.filter((slot) => slot.kind === "coach" || slot.kind === "manager"),
    },
  ];

  return (
    <Panel title={t("workspace.roster")} bodyClassName="flex flex-col gap-2 py-2">
      {groups.map((group) => (
        <div key={group.label} className="flex min-w-0 items-center gap-2">
          <p className="label-display w-16 shrink-0">{group.label}</p>
          <div className="scroll-slim flex min-w-0 flex-1 gap-2 overflow-x-auto px-1 py-1.5">
            {group.slots.map((slot) => (
              <SmallSlot
                key={slot.slotId}
                slot={slot}
                imageBase={imageBase}
                selected={selectedSlotId === slot.slotId}
                onSelect={() => onSelectSlot(slot.slotId)}
                compact
              />
            ))}
          </div>
        </div>
      ))}
    </Panel>
  );
}

function SmallSlot({
  slot,
  imageBase,
  selected,
  onSelect,
  compact = false,
}: {
  slot: ResolvedSlot;
  imageBase: string;
  selected: boolean;
  onSelect: () => void;
  compact?: boolean;
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
  const cardName = playerCardName(slot.player, showOriginalNames, locale);
  const isStaff = slot.kind === "coach" || slot.kind === "manager";
  // Coach / managers are passives-first in the dataset (no separate staff
  // roster). A slot with passives is "filled" even without a portrait.
  const staffConfigured = isStaff && activePassives > 0 && !slot.player;

  if (!slot.player && !staffConfigured) {
    return (
      <SlotButton
        slot={slot}
        onClick={onSelect}
        aria-label={`${staffLabel} — ${t("pitch.empty")}`}
        className={cn(
          "shear flex shrink-0 flex-col items-center justify-center gap-1",
          compact ? "h-[44px] w-[100px]" : "h-[60px] w-[124px]",
          "border-2 border-dashed border-ink-800 bg-ink-850/50 transition-colors",
          "hover:border-ink-700 hover:bg-ink-850",
          selected && "border-solid border-bolt-ink bg-bolt-400/10",
        )}
      >
        {slot.kind === "coach" ? (
          <StaffIcon kind="coach" size={compact ? 16 : 22} className="shear-flat opacity-50" />
        ) : slot.kind === "manager" ? (
          <StaffIcon kind="manager" size={compact ? 16 : 22} className="shear-flat opacity-50" />
        ) : (
          <Plus className={cn("shear-flat text-ink-500", compact ? "size-3" : "size-4")} />
        )}
        <span
          className={cn(
            "shear-flat font-display font-bold text-ink-500 uppercase italic",
            compact ? "text-[10px]" : "text-[12px]",
          )}
        >
          {staffLabel}
        </span>
      </SlotButton>
    );
  }

  if (staffConfigured) {
    return (
      <SlotButton
        slot={slot}
        onClick={onSelect}
        title={`${staffLabel} — ${t("pitch.passivesCount", { n: activePassives })}`}
        aria-label={`${staffLabel} — ${t("pitch.passivesCount", { n: activePassives })}`}
        className={cn(
          "shear pressable relative flex shrink-0 flex-col items-start justify-between border-2 bg-ink-950/90 px-2 text-left",
          compact ? "h-[44px] w-[100px] py-1" : "h-[60px] w-[124px] py-1.5",
          "hover:brightness-125",
          selected ? "border-bolt-ink tone-bolt" : "border-ink-700",
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
      </SlotButton>
    );
  }

  const player = slot.player;
  if (!player) return null;

  // Same card as the pitch, so a squad reads the same wherever you look at it.
  return (
    <SlotButton
      slot={slot}
      onClick={onSelect}
      title={`${staffLabel} — ${displayName}`}
      aria-label={`${staffLabel} — ${displayName}`}
      className={cn(
        "shear pressable relative shrink-0 overflow-hidden border-2 bg-ink-950/90 text-left",
        compact ? "h-[44px] w-[100px]" : "h-[60px] w-[124px]",
        "hover:brightness-125",
        selected ? "border-bolt-ink tone-bolt" : cn(rarity.border, rarity.shadow),
      )}
    >
      <PlayerAvatar
        player={player}
        imageBase={imageBase}
        displayName={displayName}
        width={compact ? 42 : 58}
        height={compact ? 42 : 58}
        ringClassName={null}
        className="shear-flat absolute top-0 -right-1 rounded-none"
      />

      <span
        className={cn(
          "shear-flat absolute top-1 left-2 flex items-start gap-0.5",
          compact ? "flex-row" : "flex-col",
        )}
      >
        <ElementBadge element={player.element} variant="icon" size={compact ? 12 : 16} />
        {slot.kind === "coach" ? (
          <StaffIcon kind="coach" size={compact ? 11 : 14} />
        ) : slot.kind === "manager" ? (
          <StaffIcon kind="manager" size={compact ? 11 : 14} />
        ) : (
          <PositionBadge position={player.position} variant="badge" size={compact ? 10 : 13} />
        )}
      </span>

      <span
        className={cn(
          "shear-flat absolute bottom-0.5 left-2 truncate font-display font-bold uppercase italic",
          compact ? "max-w-[48px] text-[10px]" : "max-w-[60px] text-[12px]",
        )}
      >
        {cardName}
      </span>

      {activePassives > 0 && (
        <span
          className="shear-flat absolute right-1 bottom-0.5 border border-ink-700 bg-ink-800 px-1 font-display text-[9px] font-bold text-ink-300 tnum"
          title={t("pitch.passivesCount", { n: activePassives })}
        >
          {activePassives}P
        </span>
      )}
    </SlotButton>
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
