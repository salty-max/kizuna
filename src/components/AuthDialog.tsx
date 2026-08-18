import { Cloud, Gamepad2, LogOut } from "lucide-react";
import { useId, useState } from "react";

import { useAuth } from "@/backend/useAuth";
import { Button, Panel } from "@/components/ui";
import { useI18n } from "@/i18n";
import { useDialogFocus } from "./useDialogFocus";

export function AuthDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { user, signInWithDiscord, signOut } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const titleId = useId();
  const dialogRef = useDialogFocus<HTMLDivElement>(onClose);

  const connect = async () => {
    setPending(true);
    setError(false);
    try {
      await signInWithDiscord();
    } catch {
      setError(true);
      setPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/80" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative z-10 w-full max-w-md outline-none"
      >
        <Panel
          title={
            <span id={titleId} className="flex items-center gap-2">
              <Cloud className="size-4 text-bolt-ink" /> {t("auth.title")}
            </span>
          }
          bodyClassName="flex flex-col gap-4"
        >
          {user ? (
            <>
              <p className="text-sm text-ink-300">
                {t("auth.connectedAs", { email: user.email ?? t("auth.account") })}
              </p>
              <p className="text-xs leading-relaxed text-ink-500">{t("auth.cloudHint")}</p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={onClose}>
                  {t("app.importClose")}
                </Button>
                <Button
                  variant="danger"
                  icon={<LogOut className="size-4" />}
                  onClick={async () => {
                    await signOut();
                    onClose();
                  }}
                >
                  {t("auth.signOut")}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-xs leading-relaxed text-ink-400">{t("auth.discordHint")}</p>
              {error && (
                <p role="alert" className="text-xs text-[var(--color-bad)]">
                  {t("auth.discordFailed")}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={onClose}>
                  {t("app.cancel")}
                </Button>
                <Button
                  variant="primary"
                  disabled={pending}
                  icon={<Gamepad2 className="size-4" />}
                  onClick={connect}
                  autoFocus
                >
                  {pending ? t("auth.redirecting") : t("auth.continueDiscord")}
                </Button>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
