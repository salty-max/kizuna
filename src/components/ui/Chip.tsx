import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/ui";

/**
 * Pastilles.
 *
 * Deux usages qu'il faut distinguer : un filtre se clique (`FilterChip`, donc
 * un `<button>` avec un état pressé), une répartition ne se clique pas
 * (`Chip`, donc un `<span>`). Les rendre identiques rendrait la moitié des
 * pastilles de l'app faussement interactives.
 */

export function Chip({
  icon,
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { icon?: ReactNode }) {
  return (
    // `pointer-events-none` sur le contenu seulement : le `title` doit rester
    // survolable, sinon l'infobulle qui donne le décompte exact ne s'ouvre pas.
    <span className={cn("chip", className)} {...rest}>
      {icon}
      {children}
    </span>
  );
}

export function FilterChip({
  active,
  icon,
  children,
  className,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean; icon?: ReactNode }) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={cn("chip chip-interactive", active && "chip-active", className)}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

/** Petit compteur en chiffres tabulaires, pour un libellé de bouton. */
export function CountBadge({ children }: { children: ReactNode }) {
  return <span className="badge-count">{children}</span>;
}
