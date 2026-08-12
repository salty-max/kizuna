import { LogIn } from "lucide-react";
import { Link, useLocation } from "react-router";

import { LanguageSwitch } from "@/components/LanguageSwitch";
import { Button } from "@/components/ui";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/ui";

/**
 * App chrome — brand, primary nav, account.
 *
 * Kept separate from the team toolbar on purpose: this bar will grow (auth,
 * extra routes) without shoving formation / share controls around.
 */

const NAV = [
  { id: "builder" as const, labelKey: "nav.builder" as const, to: "/" },
  { id: "wiki" as const, labelKey: "nav.wiki" as const, to: "/wiki" },
];

export function TopBar({ className }: { className?: string }) {
  const { t } = useI18n();
  const { pathname } = useLocation();

  return (
    <header
      className={cn("panel-flat flex shrink-0 flex-wrap items-center gap-3 px-3 py-2", className)}
    >
      <Link
        to="/"
        className="mr-1 flex items-baseline gap-2 no-underline"
        aria-label={t("nav.homeAria")}
      >
        <span className="font-display text-lg font-bold tracking-wide text-ink-50 uppercase italic">
          {t("nav.brand")}
        </span>
        <span className="hidden font-display text-[10px] font-bold tracking-wide text-ink-500 uppercase italic sm:inline">
          {t("nav.tagline")}
        </span>
      </Link>

      <nav aria-label={t("nav.label")} className="flex items-center gap-0.5">
        {NAV.map((item) => {
          const isActive =
            item.id === "builder"
              ? pathname === "/"
              : pathname === item.to || pathname.startsWith(`${item.to}/`);
          return (
            <Link
              key={item.id}
              to={item.to}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "px-2.5 py-1 font-display text-xs font-bold tracking-wide uppercase italic transition-colors",
                isActive
                  ? "bg-flare-500 text-ink-950"
                  : "text-ink-400 hover:bg-ink-850 hover:text-ink-100",
              )}
            >
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <LanguageSwitch />
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
