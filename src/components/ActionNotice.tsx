import { useEffect } from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";

import { useI18n } from "@/i18n";
import { cn } from "@/lib/ui";
import { IconButton } from "./ui";

export interface ActionFeedback {
  id: number;
  tone: "success" | "error";
  message: string;
}

export function ActionNotice({
  feedback,
  onDismiss,
}: {
  feedback: ActionFeedback;
  onDismiss: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    const timeout = window.setTimeout(onDismiss, feedback.tone === "error" ? 7000 : 4500);
    return () => window.clearTimeout(timeout);
  }, [feedback, onDismiss]);

  const Icon = feedback.tone === "success" ? CheckCircle2 : AlertTriangle;
  return (
    <div
      role={feedback.tone === "error" ? "alert" : "status"}
      className={cn(
        "panel fixed right-4 bottom-4 z-[70] flex max-w-sm items-start gap-2 border-2 p-3 shadow-[5px_5px_0_var(--color-ink-950)]",
        feedback.tone === "success"
          ? "border-[var(--color-good)] text-[var(--color-good)]"
          : "border-[var(--color-bad)] text-[var(--color-bad)]",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p className="flex-1 text-xs leading-relaxed text-ink-200">{feedback.message}</p>
      <IconButton
        className="size-6 border-transparent bg-transparent"
        onClick={onDismiss}
        aria-label={t("app.dismissNotice")}
      >
        <X className="size-3.5" />
      </IconButton>
    </div>
  );
}
