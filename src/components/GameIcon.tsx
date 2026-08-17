import type { Ability, BuildType, Element, Gender, Position } from "@/domain/types";
import { useI18n } from "@/i18n";
import { auraTypeLabel, buildTypeLabel, elementLabel, genderLabel } from "@/i18n/labels";
import {
  AURA_ICON,
  ELEMENT_ICON,
  GENDER_ICON,
  HISSATSU_ICON,
  STAFF_ICON,
  STYLE_ICON,
  iconUrl,
  positionBadgePath,
  positionSilhouettePath,
  tacticIconPath,
} from "@/lib/icons";
import { ELEMENT_KANJI, ELEMENT_STYLES, cn } from "@/lib/ui";

/**
 * Game UI glyphs from `public/icons/` (extracted from the game's own atlases).
 * Prefer these over invented SVG / kanji / plain text wherever the game has art.
 */

interface IconProps {
  size?: number;
  className?: string;
  title?: string;
}

function Glyph({
  src,
  alt,
  size = 18,
  className,
  title,
}: {
  src: string;
  alt: string;
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      title={title ?? alt}
      width={size}
      height={size}
      className={cn("inline-block shrink-0 object-contain", className)}
      draggable={false}
    />
  );
}

/* ── Element ──────────────────────────────────────────────────────────────── */

interface ElementProps extends IconProps {
  element: Element;
  /** `icon` alone; `full` adds the French name; `kanji` keeps the old text mark. */
  variant?: "icon" | "full" | "kanji";
}

export function ElementBadge({ element, variant = "full", size = 18, className }: ElementProps) {
  const { t } = useI18n();
  const style = ELEMENT_STYLES[element];
  const label = elementLabel(t, element);
  const src = iconUrl(ELEMENT_ICON[element]);

  if (variant === "kanji") {
    return (
      <span
        title={label}
        aria-label={label}
        role="img"
        className={cn(
          "kanji inline-flex shrink-0 items-center justify-center border-2 leading-none",
          style.bg,
          style.text,
          style.border,
          className,
        )}
        style={{ width: size, height: size, fontSize: size * 0.62 }}
      >
        {ELEMENT_KANJI[element]}
      </span>
    );
  }

  if (variant === "icon") {
    return <Glyph src={src} alt={label} size={size} className={className} />;
  }

  // Same chrome and typography as `StyleBadge`: the two sat side by side on
  // every player, one tinted with a plain label and one dark with a display
  // one, and read as two unrelated kinds of fact. The element's colour lives in
  // its glyph, which is why the frame no longer needs to carry it.
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 border-2 border-ink-700 bg-ink-850 px-1.5 py-0.5 text-ink-200",
        className,
      )}
    >
      <Glyph src={src} alt="" size={size * 0.9} title={label} />
      <span className="font-display text-[11px] font-bold tracking-wide uppercase italic">
        {label}
      </span>
    </span>
  );
}

/* ── Gender ───────────────────────────────────────────────────────────────── */

interface GenderProps extends IconProps {
  gender: Gender;
  /**
   * `icon` alone (male/female); `full` adds the localised label.
   *
   * `compact` is for sitting beside a name: the glyph when the game ships one,
   * the word when it does not. The game only draws male and female, so the
   * `icon` fallback is a `?` — correct for `Unknown`, but a lie for the 36
   * characters the dump explicitly calls `other`.
   */
  variant?: "icon" | "full" | "compact";
}

export function GenderBadge({ gender, variant = "icon", size = 16, className }: GenderProps) {
  const { t } = useI18n();
  const label = genderLabel(t, gender);
  const path = GENDER_ICON[gender];

  if (!path) {
    if (variant === "icon") {
      return (
        <span
          title={label}
          aria-label={label}
          className={cn(
            "inline-flex shrink-0 items-center justify-center border border-ink-700 bg-ink-950",
            "font-display text-[9px] font-bold text-ink-400 uppercase",
            className,
          )}
          style={{ width: size, height: size }}
        >
          ?
        </span>
      );
    }
    return <span className={cn("text-xs text-ink-400", className)}>{label}</span>;
  }

  const glyph = <Glyph src={iconUrl(path)} alt={label} size={size} className={className} />;
  if (variant === "icon" || variant === "compact") return glyph;

  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1", className)}>
      {glyph}
      <span className="text-xs text-ink-300">{label}</span>
    </span>
  );
}

/* ── Position ─────────────────────────────────────────────────────────────── */

interface PositionProps extends IconProps {
  position: Position;
  /**
   * `silhouette` — white pictogram, best under ~20px (language-agnostic).
   * `badge` — coloured localised text glyph (GAR/DÉF/MIL/ATT, GK/DF/MF/FW…).
   * `full` — badge + letter code.
   */
  variant?: "silhouette" | "badge" | "full";
}

export function PositionBadge({
  position,
  variant = "badge",
  size = 18,
  className,
}: PositionProps) {
  const { locale } = useI18n();

  if (variant === "silhouette") {
    return (
      <Glyph
        src={iconUrl(positionSilhouettePath(position))}
        alt={position}
        size={size}
        className={className}
      />
    );
  }

  const badge = (
    <img
      src={iconUrl(positionBadgePath(position, locale))}
      alt={position}
      title={position}
      // Badges are wide (~102×60); height drives the scale.
      height={size}
      className={cn("inline-block shrink-0 object-contain", className)}
      style={{ height: size, width: "auto" }}
      draggable={false}
    />
  );

  if (variant === "badge") return badge;

  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1", className)}>
      {badge}
      <span className="text-[11px] font-semibold text-ink-300">{position}</span>
    </span>
  );
}

/* ── Style / archetype ────────────────────────────────────────────────────── */

interface StyleProps extends IconProps {
  buildType: BuildType;
  variant?: "icon" | "full";
}

export function StyleBadge({ buildType, variant = "full", size = 18, className }: StyleProps) {
  const { t } = useI18n();
  const label = buildTypeLabel(t, buildType);
  const src = iconUrl(STYLE_ICON[buildType]);

  if (variant === "icon") {
    return <Glyph src={src} alt={label} size={size} className={className} />;
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 border-2 border-ink-700 bg-ink-850 px-1.5 py-0.5 text-ink-200",
        className,
      )}
    >
      <Glyph src={src} alt="" size={size * 0.9} title={label} />
      <span className="font-display text-[11px] font-bold tracking-wide uppercase italic">
        {label}
      </span>
    </span>
  );
}

/* ── Hissatsu category ────────────────────────────────────────────────────── */

interface HissatsuProps extends IconProps {
  category: string;
}

export function HissatsuIcon({
  category,
  size = 20,
  className,
  title,
}: HissatsuProps & { title?: string }) {
  const path = HISSATSU_ICON[category];
  // Auras have no category glyph in the extracted atlases — skip rather than
  // invent one. Shoot / Dribble / Block / Catch always resolve.
  if (!path) return null;
  return (
    <Glyph
      src={iconUrl(path)}
      alt={title ?? category}
      size={size}
      className={className}
      title={title ?? category}
    />
  );
}

/**
 * A move's badge: category for a hissatsu, mechanic for an aura. Both occupy
 * the same slot because they answer the same question — "what is this thing".
 * `awakening_change` has no badge assigned (a single aura, no glyph left): we
 * render nothing rather than borrowing another mechanic's.
 */
export function AbilityIcon({
  ability,
  size = 16,
  className,
}: IconProps & { ability: Pick<Ability, "kind" | "type" | "auraType"> }) {
  const { t } = useI18n();

  if (ability.kind !== "aura") {
    return <HissatsuIcon category={ability.type} size={size} className={className} />;
  }

  const path = ability.auraType ? AURA_ICON[ability.auraType] : undefined;
  if (!path || !ability.auraType) return null;

  return (
    <Glyph
      src={iconUrl(path)}
      alt={auraTypeLabel(t, ability.auraType)}
      size={size}
      className={className}
    />
  );
}

/* ── Staff ────────────────────────────────────────────────────────────────── */

/**
 * A staff slot's icon.
 *
 * Slot names follow the game's (Coach + Managers), so the extracted files map
 * straight across: megaphone for the coach, first-aid kit for the managers. It
 * was the old naming — "Manager + Coordinators" — that produced two swapped
 * icons.
 */
export function StaffIcon({
  kind,
  size = 20,
  className,
}: {
  kind: "coach" | "manager";
  size?: number;
  className?: string;
}) {
  const { t } = useI18n();
  const label = kind === "coach" ? t("pitch.coach") : t("pitch.managerRole");
  return <Glyph src={iconUrl(STAFF_ICON[kind])} alt={label} size={size} className={className} />;
}

/* ── Tactics ──────────────────────────────────────────────────────────────── */

export function TacticIcon({
  tacticId,
  size = 20,
  className,
  title,
}: IconProps & { tacticId: string; title?: string }) {
  return (
    <Glyph
      src={iconUrl(tacticIconPath(tacticId))}
      alt={title ?? tacticId}
      size={size}
      className={className}
      title={title}
    />
  );
}
