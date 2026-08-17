import type { ReactNode } from "react";

import { cn } from "@/lib/ui";

/**
 * Key/value rows.
 *
 * The "label left, number right, rule between" pattern recurred across stats,
 * powers, gauges and totals, with a different rule every time. Numbers use
 * tabular figures throughout: that is what lets a column be compared at a
 * glance.
 */

export function DataRow({
  label,
  value,
  extra,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  /** Secondary value — conditional cap, equipment top-up. */
  extra?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-3 border-t border-ink-850 py-1 first:border-0",
        className,
      )}
    >
      <span className="label-display min-w-0 truncate">{label}</span>
      <span className="flex shrink-0 items-baseline gap-1.5">
        <span className="font-semibold tnum">{value}</span>
        {extra && <span className="text-[11px] text-ink-500 tnum">{extra}</span>}
      </span>
    </div>
  );
}

/** A group of `DataRow`s, so the top rule lands in the right place. */
export function DataList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col", className)}>{children}</div>;
}
