import { useId, useState } from "react";
import { Check, Copy, Download, Link2 } from "lucide-react";

import { Button, Panel } from "@/components/ui";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/ui";
import { useDialogFocus } from "./useDialogFocus";

/** Share / import dialogs for team codes (`KZ1…`). */

export function ShareDialog({
  code,
  copied,
  onCopyCode,
  onCopyLink,
  onClose,
}: {
  code: string;
  copied: "code" | "link" | null;
  onCopyCode: () => void;
  onCopyLink: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();

  return (
    <ModalShell title={t("app.shareTitle")} onClose={onClose}>
      <p className="text-xs text-ink-400">{t("app.shareHint")}</p>
      <label className="flex flex-col gap-1">
        <span className="label-display text-ink-500">{t("app.shareCode")}</span>
        <textarea
          readOnly
          value={code}
          rows={5}
          className="field scroll-slim h-auto min-h-[7rem] resize-y py-2 font-mono text-[11px] leading-relaxed break-all"
          onFocus={(event) => event.currentTarget.select()}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          onClick={onCopyCode}
          icon={copied === "code" ? <Check className="size-4" /> : <Copy className="size-4" />}
        >
          {copied === "code" ? t("app.codeCopied") : t("app.copyCode")}
        </Button>
        <Button
          onClick={onCopyLink}
          icon={copied === "link" ? <Check className="size-4" /> : <Link2 className="size-4" />}
        >
          {copied === "link" ? t("app.linkCopied") : t("app.copyLink")}
        </Button>
        <Button variant="ghost" onClick={onClose} className="ml-auto">
          {t("app.importClose")}
        </Button>
      </div>
    </ModalShell>
  );
}

export function ImportDialog({
  onImport,
  onClose,
}: {
  onImport: (raw: string) => boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState(false);
  const errorId = useId();

  return (
    <ModalShell title={t("app.importTitle")} onClose={onClose}>
      <p className="text-xs text-ink-400">{t("app.importHint")}</p>
      <textarea
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          setError(false);
        }}
        rows={5}
        placeholder={t("app.importPlaceholder")}
        aria-label={t("app.importField")}
        aria-invalid={error}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "field scroll-slim h-auto min-h-[7rem] resize-y py-2 font-mono text-[11px] leading-relaxed break-all",
          error && "border-[var(--color-bad)]",
        )}
        autoFocus
      />
      {error && (
        <p id={errorId} role="alert" className="text-xs text-[var(--color-bad)]">
          {t("app.importInvalid")}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          onClick={() => setError(!onImport(draft))}
          icon={<Download className="size-4" />}
        >
          {t("app.importLoad")}
        </Button>
        <Button variant="ghost" onClick={onClose} className="ml-auto">
          {t("app.importClose")}
        </Button>
      </div>
    </ModalShell>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const titleId = useId();
  const dialogRef = useDialogFocus<HTMLDivElement>(onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/80" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative z-10 w-full max-w-lg outline-none"
      >
        <Panel title={<span id={titleId}>{title}</span>} bodyClassName="flex flex-col gap-3">
          {children}
        </Panel>
      </div>
    </div>
  );
}
