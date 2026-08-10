import type { Element } from "@/domain/types";
import { ELEMENT_KANJI, ELEMENT_LABELS, ELEMENT_STYLES, cn } from "@/lib/ui";

/**
 * Elements are shown as their kanji, the way the game itself does it.
 *
 * There is nothing to fetch — Inazugle renders elements as plain text (they are
 * checkbox labels in its filter and nothing more), with no artwork in its
 * markup, its CSS or its character sheets. Drawn SVG glyphs were the first
 * attempt and lost against this: 火風林山 is what the source material uses, it
 * needs no artwork, and a single dense character stays legible at 16px where a
 * line drawing turns to mush.
 */

interface Props {
  element: Element;
  /** `kanji` is the bare mark for tight spots; `full` adds the name. */
  variant?: "kanji" | "full";
  size?: number;
  className?: string;
}

export function ElementBadge({ element, variant = "full", size = 18, className }: Props) {
  const style = ELEMENT_STYLES[element];
  const label = ELEMENT_LABELS[element];
  const kanji = ELEMENT_KANJI[element];

  if (variant === "kanji") {
    return (
      <span
        title={label}
        aria-label={label}
        role="img"
        className={cn(
          "kanji inline-flex shrink-0 items-center justify-center rounded border leading-none",
          style.bg,
          style.text,
          style.border,
          className,
        )}
        style={{ width: size, height: size, fontSize: size * 0.62 }}
      >
        {kanji}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5",
        style.bg,
        style.text,
        className,
      )}
    >
      <span className="kanji leading-none" style={{ fontSize: size * 0.75 }} aria-hidden="true">
        {kanji}
      </span>
      {label}
    </span>
  );
}
