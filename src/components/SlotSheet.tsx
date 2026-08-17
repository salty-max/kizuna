import { X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type TransitionEvent,
} from "react";
import { createPortal } from "react-dom";

import { IconButton } from "@/components/ui";
import { useI18n } from "@/i18n";
import { useDialogFocus } from "./useDialogFocus";

type DrawerState = "opening" | "open" | "closing";

/**
 * Right-side editor for a pitch/bench/staff slot.
 *
 * Replaces the old team/slot tabs: team composition stays on the main rail while
 * the player build opens as a focused sheet (less nested scroll, clearer mode).
 */
export function SlotSheet({
  title,
  subtitle,
  actions,
  onClose,
  children,
}: {
  /** Names the dialog for assistive tech; the body already shows it. */
  title: string;
  subtitle?: string | null;
  /**
   * Controls that must survive scrolling. The editor is several panels tall,
   * and swapping or clearing the player is the one thing a reader reaches for
   * from anywhere in it.
   */
  actions?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const subtitleId = useId();
  const [drawerState, setDrawerState] = useState<DrawerState>("opening");
  const requestClose = useCallback(() => setDrawerState("closing"), []);
  // Explicitly the close button, not merely the first focusable one: the header
  // now leads with `Changer`, and landing there would make Enter open the player
  // picker the instant the sheet appears.
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useDialogFocus<HTMLDivElement>(requestClose, closeRef);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setDrawerState("open"));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  // A drawer is part of the current task, not a second scroll surface behind it.
  useEffect(() => {
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previousOverflow;
    };
  }, []);

  // `transitionend` is the normal path. The timeout also covers reduced-motion
  // styles and browsers that suppress the event when a tab loses visibility.
  useEffect(() => {
    if (drawerState !== "closing") return;
    const fallback = window.setTimeout(onClose, 320);
    return () => window.clearTimeout(fallback);
  }, [drawerState, onClose]);

  const finishClosing = (event: TransitionEvent<HTMLDivElement>) => {
    if (
      drawerState === "closing" &&
      event.target === event.currentTarget &&
      event.propertyName === "transform"
    ) {
      onClose();
    }
  };

  return createPortal(
    <div className="drawer-root" data-state={drawerState}>
      <div className="drawer-backdrop" aria-hidden="true" onClick={requestClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        className="drawer-panel"
        data-state={drawerState}
        onTransitionEnd={finishClosing}
      >
        {/*
          The heading is read, not shown: the identity panel right below already
          gives the name, the position and the club, so printing them again cost
          a third of the sheet's first screen.
        */}
        <header className="flex shrink-0 items-center gap-2 border-b-2 border-ink-800 p-3">
          <h2 id={titleId} className="sr-only">
            {title}
          </h2>
          {subtitle ? (
            <p id={subtitleId} className="sr-only">
              {subtitle}
            </p>
          ) : null}
          {actions}
          <IconButton
            ref={closeRef}
            onClick={requestClose}
            aria-label={t("app.importClose")}
            className="ml-auto"
          >
            <X className="size-4" />
          </IconButton>
        </header>
        <div className="scroll-slim min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
