import type { ReactNode } from "react";

import { cn } from "@/lib/ui";

/**
 * The app's base box.
 *
 * Before it was extracted, 27 panels were hand-written and each improvised its
 * own body: `p-3` here, `px-3 pt-3 pb-2` there, `panel-body` twice out of
 * eleven. The vermilion title has to sit flush with the border, which forces
 * the header apart from the padded body — exactly the kind of detail that gets
 * forgotten one time in three when every call site reinvents it.
 */

interface PanelProps {
  /** Vermilion title bar. Omitted, the panel has no header. */
  title?: ReactNode;
  /** Right-aligned in the title bar — a counter, a quiet action. */
  action?: ReactNode;
  /** Heading level, so the document outline stays correct. */
  as?: "h2" | "h3";
  children: ReactNode;
  /** `false` when the content handles its own margins (table, scrollable list). */
  padded?: boolean;
  /** Drop shadow. `false` for a nested panel, which has nothing to hover over. */
  raised?: boolean;
  className?: string;
  bodyClassName?: string;
}

export function Panel({
  title,
  action,
  as: Heading = "h2",
  children,
  padded = true,
  raised = true,
  className,
  bodyClassName,
}: PanelProps) {
  return (
    <section className={cn(raised ? "panel" : "panel-flat", "overflow-hidden", className)}>
      {title !== undefined && (
        <header className="panel-title justify-between">
          <Heading className="min-w-0 truncate">{title}</Heading>
          {action}
        </header>
      )}

      <div className={cn(padded && "panel-body", bodyClassName)}>{children}</div>
    </section>
  );
}

/**
 * The explanatory line under a panel title.
 *
 * There were two competing variants — `text-[11px] text-ink-500` and
 * `label-display` — for the same role. One from now on.
 */
export function PanelHint({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("mb-2 text-[11px] leading-snug text-ink-500", className)}>{children}</p>;
}

/** Quiet counter for the right-hand corner of a title bar. */
export function PanelMeta({ children }: { children: ReactNode }) {
  return <span className="muted tnum shrink-0">{children}</span>;
}
