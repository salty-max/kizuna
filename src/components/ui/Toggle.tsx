import type { ReactNode } from "react";

import { cn } from "@/lib/ui";

/**
 * Bascule.
 *
 * Un `<input type="checkbox">` a beau accepter `accent-color`, sa case reste
 * drawn by the OS: rounded corners on macOS, no adjustable size, and a
 * checkmark unrelated to everything else. Here the track is square and the knob
 * jumps from edge to edge — the same grammar as the cards.
 *
 * It really is a `role="switch"` and not a checkbox: the state applies
 * immediately, it does not wait on a form submission.
 */

export function Toggle({
  checked,
  onChange,
  children,
  hint,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children?: ReactNode;
  hint?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      title={hint}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 border-2 px-2 font-display text-[11px]",
        "font-bold tracking-wide uppercase italic transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bolt-400",
        "disabled:cursor-not-allowed disabled:opacity-40",
        checked
          ? "border-bolt-400 bg-bolt-400/15 text-bolt-400"
          : "border-ink-800 bg-ink-850 text-ink-500 hover:border-ink-600 hover:text-ink-300",
        className,
      )}
      style={{ height: "var(--control-h)" }}
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative h-3.5 w-6 shrink-0 border transition-colors",
          checked ? "border-bolt-400 bg-bolt-400/25" : "border-ink-700 bg-ink-950",
        )}
      >
        <span
          className={cn(
            "absolute top-0 bottom-0 w-2.5 transition-[left] duration-150 ease-out",
            checked ? "left-[calc(100%-0.625rem)] bg-bolt-400" : "left-0 bg-ink-600",
          )}
        />
      </span>
      {children}
    </button>
  );
}
