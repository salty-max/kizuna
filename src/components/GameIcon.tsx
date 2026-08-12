import type { Ability, BuildType, Element, Position } from "@/domain/types";
import { useI18n } from "@/i18n";
import { auraTypeLabel, buildTypeLabel, elementLabel } from "@/i18n/labels";
import {
  AURA_ICON,
  ELEMENT_ICON,
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

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 border border-current/20 px-1.5 py-0.5",
        style.bg,
        style.text,
        className,
      )}
    >
      <Glyph src={src} alt="" size={size * 0.9} title={label} />
      {label}
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
 * Le badge d'une technique : catégorie pour un hissatsu, mécanique pour une
 * aura. Les deux occupent la même case parce qu'ils répondent à la même
 * question — « c'est quoi, ce truc ». `awakening_change` n'a aucun badge
 * attribué (une seule aura, aucun glyphe restant) : on n'affiche rien plutôt
 * que d'emprunter celui d'une autre mécanique.
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
 * Icône d'un slot de staff.
 *
 * Les noms de slot suivent ceux du jeu (Coach + Managers), donc les fichiers
 * extraits se mappent directement : mégaphone pour le coach, trousse de secours
 * pour les managers. C'est l'ancien nommage — « Manager + Coordinateurs » — qui
 * donnait deux icônes inversées.
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
