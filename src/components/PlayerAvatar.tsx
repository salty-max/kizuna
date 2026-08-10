import { useState } from "react";

import { imageUrl } from "@/data/load";
import type { Player } from "@/domain/types";
import { ELEMENT_STYLES, cn } from "@/lib/ui";

interface Props {
  player: Player;
  imageBase: string;
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
  size,
  width,
  height,
  ringClassName,
  className,
}: Props) {
  const [failed, setFailed] = useState(false);
  const element = ELEMENT_STYLES[player.element];

  const boxWidth = width ?? size ?? 40;
  const boxHeight = height ?? size ?? 40;

  const initials = player.name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase();

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        "ring-2 ring-inset",
        failed && element.bg,
        ringClassName === null ? "ring-0" : (ringClassName ?? element.ring),
        className,
      )}
      style={{ width: boxWidth, height: boxHeight }}
    >
      {failed ? (
        <span
          className={cn("font-semibold", element.text)}
          style={{ fontSize: Math.max(10, Math.min(boxWidth, boxHeight) * 0.36) }}
        >
          {initials}
        </span>
      ) : (
        <img
          src={imageUrl(imageBase, player.image, Math.ceil(Math.max(boxWidth, boxHeight) * 2))}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
