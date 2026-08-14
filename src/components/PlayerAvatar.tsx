import { imageUrl } from "@/data/load";
import type { Player } from "@/domain/types";
import { ELEMENT_STYLES, cn } from "@/lib/ui";
import { InazugleImage } from "./InazugleImage";

interface Props {
  player: Player;
  imageBase: string;
  /** Name used for initials fallback; defaults to `player.name`. */
  displayName?: string;
  /** Square shorthand; pass `width`/`height` when the portrait is not square. */
  size?: number;
  width?: number;
  height?: number;
  /**
   * `undefined` keeps the element ring, a string swaps it, `null` drops it —
   * pitch cards carry rarity on the card border and want no ring competing.
   */
  ringClassName?: string | null;
  className?: string;
}

/**
 * Portraits are hotlinked from a third-party CDN, so a missing image is a
 * routine outcome rather than an error — fall back to initials instead of
 * leaving a broken-image glyph on the pitch.
 *
 * The artwork is RGBA with a transparent surround, so the container must stay
 * transparent too and let whatever is behind show through. The element tint is
 * applied only to the initials fallback, which does need a backdrop of its own.
 */
export function PlayerAvatar({
  player,
  imageBase,
  displayName,
  size,
  width,
  height,
  ringClassName,
  className,
}: Props) {
  const element = ELEMENT_STYLES[player.element];
  const boxWidth = width ?? size ?? 40;
  const boxHeight = height ?? size ?? 40;
  const src = player.image
    ? imageUrl(imageBase, player.image, Math.ceil(Math.max(boxWidth, boxHeight) * 2))
    : "";

  const initials = (displayName ?? player.name)
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase();

  const fallback = (
    <span
      className={cn(
        "flex h-full w-full items-center justify-center font-semibold",
        element.bg,
        element.text,
      )}
      style={{ fontSize: Math.max(10, Math.min(boxWidth, boxHeight) * 0.36) }}
    >
      {initials}
    </span>
  );

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        "ring-2 ring-inset",
        !src && element.bg,
        ringClassName === null ? "ring-0" : (ringClassName ?? element.ring),
        className,
      )}
      style={{ width: boxWidth, height: boxHeight }}
    >
      {src ? (
        <InazugleImage
          src={src}
          kind="portrait"
          alt=""
          loading="lazy"
          frameClassName="absolute inset-0"
          className="h-full w-full object-cover"
          fallback={fallback}
        />
      ) : (
        fallback
      )}
    </span>
  );
}
