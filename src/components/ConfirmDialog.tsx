import { AlertTriangle } from "lucide-react";
import { useId } from "react";

import { Button, Panel } from "@/components/ui";
import { useDialogFocus } from "./useDialogFocus";

interface Props {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}

/** Accessible confirmation for destructive actions. Cancel receives focus first. */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onClose,
}: Props) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useDialogFocus<HTMLDivElement>(onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/80" onClick={onClose} />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="relative z-10 w-full max-w-md outline-none"
      >
        <Panel title={<span id={titleId}>{title}</span>} bodyClassName="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center border-2 border-[var(--color-bad)] bg-bad/10 text-[var(--color-bad)]">
              <AlertTriangle className="size-5" aria-hidden />
            </span>
            <p id={descriptionId} className="text-sm leading-relaxed text-ink-300">
              {description}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose} autoFocus>
              {cancelLabel}
            </Button>
            <Button variant="danger" onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
