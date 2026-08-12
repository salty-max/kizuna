import type { ReactNode } from "react";

import { cn } from "@/lib/ui";

/**
 * Lignes clé/valeur.
 *
 * Le motif « libellé à gauche, nombre à droite, filet entre les deux » revenait
 * dans les stats, les puissances, les jauges et les totaux, avec un filet
 * différent à chaque fois. Les nombres sont en chiffres tabulaires partout :
 * c'est ce qui permet de comparer une colonne d'un coup d'œil.
 */

export function DataRow({
  label,
  value,
  extra,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  /** Valeur secondaire — plafond conditionnel, appoint d'équipement. */
  extra?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-3 border-t border-ink-850 py-1 first:border-0",
        className,
      )}
    >
      <span className="label-display min-w-0 truncate">{label}</span>
      <span className="flex shrink-0 items-baseline gap-1.5">
        <span className="font-semibold tnum">{value}</span>
        {extra && <span className="text-[11px] text-ink-500 tnum">{extra}</span>}
      </span>
    </div>
  );
}

/** Groupe de `DataRow`, pour que le filet supérieur tombe au bon endroit. */
export function DataList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col", className)}>{children}</div>;
}
