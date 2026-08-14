import type { ReactNode } from "react";
import { Coffee } from "lucide-react";

import { useDataset } from "@/data/useDataset";
import { useI18n } from "@/i18n";
import { cn, formatDateTime } from "@/lib/ui";

const GITHUB_URL = "https://github.com/salty-max/kizuna";
const KOFI_URL = "https://ko-fi.com/salty_max";

/**
 * App footer — disclaimer, data stamp, outbound project links.
 *
 * Sits under the routed page so builder + wiki share the same chrome without
 * each page re-implementing legal text and support links.
 */
export function Footer({ className }: { className?: string }) {
  const { t, locale } = useI18n();
  const dataset = useDataset();

  return (
    <footer
      className={cn(
        "panel-flat flex shrink-0 flex-col items-center gap-2 px-3 py-2.5 sm:flex-row sm:justify-between sm:gap-3",
        className,
      )}
    >
      <div className="min-w-0 text-center sm:text-left">
        <p className="font-display text-[11px] font-bold tracking-wide text-ink-500 uppercase italic">
          {t("app.footer")}
        </p>
        {dataset.generatedAt && (
          <p className="mt-0.5 text-[10px] text-ink-500 tnum">
            {t("app.footerDataOf", { date: formatDateTime(dataset.generatedAt, locale) })}
          </p>
        )}
      </div>

      <nav
        aria-label={t("app.footerLinks")}
        className="flex shrink-0 flex-wrap items-center justify-center gap-1.5"
      >
        <FooterLink href={GITHUB_URL} label={t("app.footerGithub")}>
          <GithubMark className="size-3.5" />
          <span>GitHub</span>
        </FooterLink>
        <FooterLink href={KOFI_URL} label={t("app.footerKofi")}>
          <Coffee className="size-3.5" aria-hidden />
          <span>Ko-fi</span>
        </FooterLink>
      </nav>
    </footer>
  );
}

function FooterLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center gap-1.5 border-2 border-ink-800 bg-ink-950 px-2 py-1",
        "font-display text-[11px] font-bold tracking-wide text-ink-300 uppercase italic no-underline",
        "transition-colors hover:border-bolt-400 hover:text-bolt-400",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bolt-400",
      )}
    >
      {children}
    </a>
  );
}

/** Lucide dropped brand icons — small GitHub mark keeps the footer self-contained. */
function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
    </svg>
  );
}
