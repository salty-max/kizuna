import { LogIn } from "lucide-react";

import { LanguageSwitch } from "@/components/LanguageSwitch";
import { Button } from "@/components/ui";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/ui";

/**
 * App chrome — brand, primary nav, account.
 *
 * Kept separate from the team toolbar on purpose: this bar will grow (auth,
 * extra routes) without shoving formation / share controls around. Nav items
 * beyond Builder are placeholders until those screens exist.
 */

type NavId = "builder";

const NAV: { id: NavId; labelKey: "nav.builder"; href?: string }[] = [
  { id: "builder", labelKey: "nav.builder" },
];

export function TopBar({ className }: { className?: string }) {
  const { t } = useI18n();
  const active: NavId = "builder";

  return (
    <header
      className={cn("panel-flat flex shrink-0 flex-wrap items-center gap-3 px-3 py-2", className)}
    >
      <a href="/" className="mr-1 flex items-baseline gap-2 no-underline">
        <span className="font-display text-lg font-bold tracking-wide text-ink-50 uppercase italic">
          Kizuna
        </span>
        <span className="hidden font-display text-[10px] font-bold tracking-wide text-ink-500 uppercase italic sm:inline">
          Victory Road
        </span>
      </a>

      <nav aria-label={t("nav.label")} className="flex items-center gap-0.5">
        {NAV.map((item) => {
          const isActive = item.id === active;
          return (
            <a
              key={item.id}
              href={item.href ?? "#"}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "px-2.5 py-1 font-display text-xs font-bold tracking-wide uppercase italic transition-colors",
                isActive
                  ? "bg-flare-500 text-ink-950"
                  : "text-ink-400 hover:bg-ink-850 hover:text-ink-100",
              )}
              onClick={(event) => {
                // Single-page for now — keep the hash/team intact.
                if (!item.href) event.preventDefault();
              }}
            >
              {t(item.labelKey)}
            </a>
          );
        })}
      </nav>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <LanguageSwitch />
        {/* Auth is not wired yet — keep the control visible so the chrome
            shape is final, but mark it as upcoming for a11y + hover. */}
        <Button
          size="sm"
          variant="ghost"
          disabled
          aria-disabled="true"
          title={t("nav.signInSoon")}
          icon={<LogIn className="size-3.5" />}
          className="opacity-60"
        >
          {t("nav.signIn")}
          <span className="ml-1 font-display text-[9px] font-bold tracking-wide text-ink-500 uppercase not-italic">
            {t("nav.soon")}
          </span>
        </Button>
      </div>
    </header>
  );
}
