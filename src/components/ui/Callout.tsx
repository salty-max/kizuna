import { AlertTriangle, Info } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/ui";

/**
 * Encadrés d'avertissement.
 *
 * Le ton porte l'icône : une violation de règle du jeu et une estimation
 * incertaine ne doivent pas se ressembler, et ce choix ne doit pas se refaire
 * à chaque appel — c'est comme ça qu'un ⚠️ finit par annoncer une bonne
 * nouvelle quelque part dans l'app.
 */

type Tone = "bad" | "warn" | "info";

const TONE_CLASS: Record<Tone, string> = {
  bad: "callout-bad",
  warn: "callout-warn",
  info: "callout-info",
};

const TONE_ICON: Record<Tone, typeof AlertTriangle> = {
  bad: AlertTriangle,
  warn: AlertTriangle,
  info: Info,
};

export function Callout({
  tone = "info",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  const Icon = TONE_ICON[tone];

  return (
    <p className={cn("callout flex items-start gap-1.5", TONE_CLASS[tone], className)}>
      <Icon className="mt-px size-3.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}
