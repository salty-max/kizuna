import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/ui";

/**
 * Chips.
 *
 * Two uses worth keeping apart: a filter is clicked (`FilterChip`, so a
 * `<button>` with a pressed state), a breakdown is not (`Chip`, so a `<span>`).
 * Making them identical would leave half the app's chips falsely interactive.
 */

export function Chip({
  icon,
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { icon?: ReactNode }) {
  return (
    // `pointer-events-none` on the content only: the `title` must stay
    // hoverable, or the tooltip carrying the exact count never opens.
    <span className={cn("chip", className)} {...rest}>
      {icon}
      {children}
    </span>
  );
}

export function FilterChip({
  active,
  icon,
  children,
  className,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean; icon?: ReactNode }) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={cn("chip chip-interactive", active && "chip-active", className)}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

/** Small tabular-figures counter, for a button label. */
export function CountBadge({ children }: { children: ReactNode }) {
  return <span className="badge-count">{children}</span>;
}
