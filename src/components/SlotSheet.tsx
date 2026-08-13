import { X } from "lucide-react";
import type { ReactNode } from "react";

import { IconButton } from "@/components/ui";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/ui";
import { useDialogFocus } from "./useDialogFocus";

/**
 * Right-side editor for a pitch/bench/staff slot.
 *
 * Replaces the old team/slot tabs: team composition stays on the main rail while
 * the player build opens as a focused sheet (less nested scroll, clearer mode).
 */
export function SlotSheet({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string | null;
  onClose: () => void;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const dialogRef = useDialogFocus<HTMLDivElement>(onClose);

  return (
    <div
      className="overlay flex items-stretch justify-end sm:p-3 lg:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "modal flex h-full w-full max-w-lg flex-col sm:max-h-[min(100%,52rem)]",
          "shadow-[-6px_0_0_var(--shadow-hard-color)] sm:shadow-[5px_6px_0_var(--shadow-hard-color)]",
        )}
      >
        <header className="flex shrink-0 items-start gap-2 border-b-2 border-ink-800 p-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-base font-bold tracking-wide text-ink-100 uppercase italic">
              {title}
            </h2>
            {subtitle ? <p className="mt-0.5 truncate text-xs text-ink-500">{subtitle}</p> : null}
          </div>
          <IconButton onClick={onClose} aria-label={t("app.importClose")}>
            <X className="size-4" />
          </IconButton>
        </header>
        <div className="scroll-slim min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
          {children}
        </div>
      </div>
    </div>
  );
}
