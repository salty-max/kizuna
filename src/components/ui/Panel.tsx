import type { ReactNode } from "react";

import { cn } from "@/lib/ui";

/**
 * La boîte de base de l'app.
 *
 * Avant extraction, 27 panneaux étaient écrits à la main et improvisaient tous
 * leur corps : `p-3` ici, `px-3 pt-3 pb-2` là, `panel-body` deux fois sur
 * onze. Le titre vermillon doit être à fleur de bordure, ce qui oblige à
 * séparer l'en-tête du corps padé — c'est exactement le genre de détail qu'on
 * oublie une fois sur trois quand chaque appel le réinvente.
 */

interface PanelProps {
  /** Barre de titre vermillon. Omise, le panneau n'a pas d'en-tête. */
  title?: ReactNode;
  /** Aligné à droite dans la barre de titre — compteur, action discrète. */
  action?: ReactNode;
  /** Niveau du titre, pour que la hiérarchie du document reste juste. */
  as?: "h2" | "h3";
  children: ReactNode;
  /** `false` quand le contenu gère lui-même ses marges (tableau, liste scrollable). */
  padded?: boolean;
  /** Ombre portée. `false` pour un panneau imbriqué, qui n'a rien à survoler. */
  raised?: boolean;
  className?: string;
  bodyClassName?: string;
}

export function Panel({
  title,
  action,
  as: Heading = "h2",
  children,
  padded = true,
  raised = true,
  className,
  bodyClassName,
}: PanelProps) {
  return (
    <section className={cn(raised ? "panel" : "panel-flat", "overflow-hidden", className)}>
      {title !== undefined && (
        <header className="panel-title justify-between">
          <Heading className="min-w-0 truncate">{title}</Heading>
          {action}
        </header>
      )}

      <div className={cn(padded && "panel-body", bodyClassName)}>{children}</div>
    </section>
  );
}

/**
 * La ligne d'explication sous un titre de panneau.
 *
 * Il y en avait deux variantes concurrentes — `text-[11px] text-ink-500` et
 * `label-display` — pour le même rôle. Une seule désormais.
 */
export function PanelHint({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("mb-2 text-[11px] leading-snug text-ink-500", className)}>{children}</p>;
}

/** Compteur discret pour le coin droit d'une barre de titre. */
export function PanelMeta({ children }: { children: ReactNode }) {
  return <span className="muted tnum shrink-0">{children}</span>;
}
