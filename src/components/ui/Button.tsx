import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/ui";

/**
 * Boutons.
 *
 * La profondeur ne vient pas d'ici : `.pressable` porte l'ombre et le geste
 * d'appui, un utilitaire de teinte dit sa couleur. C'est la même composition
 * que les cartes joueur, donc les deux s'enfoncent exactement pareil sans
 * partager de code — ce qui est tout l'intérêt.
 */

type Variant = "default" | "primary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md";
  /** Icône avant le libellé. Seule, préférer `IconButton`. */
  icon?: ReactNode;
}

const VARIANT_CLASS: Record<Variant, string> = {
  default: "",
  primary: "btn-primary tone-bolt",
  ghost: "btn-ghost",
  danger: "btn-danger",
};

export function Button({
  variant = "default",
  size = "md",
  icon,
  children,
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "btn",
        variant !== "ghost" && "pressable",
        VARIANT_CLASS[variant],
        size === "sm" && "btn-sm",
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

/**
 * Un lien qui doit ressembler à un bouton. C'est bien un `<a>` : il navigue,
 * donc il doit s'ouvrir dans un onglet, se copier, s'annoncer comme un lien.
 * Seule l'apparence est empruntée.
 */
export function LinkButton({
  variant = "default",
  size = "md",
  icon,
  children,
  className,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: Variant;
  size?: "sm" | "md";
  icon?: ReactNode;
}) {
  return (
    <a
      className={cn(
        "btn",
        variant !== "ghost" && "pressable",
        VARIANT_CLASS[variant],
        size === "sm" && "btn-sm",
        className,
      )}
      {...rest}
    >
      {children}
      {icon}
    </a>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Obligatoire : un bouton sans texte doit se nommer pour l'accessibilité. */
  "aria-label": string;
  children: ReactNode;
  tone?: "default" | "danger";
}

export function IconButton({
  children,
  className,
  tone = "default",
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "btn-icon",
        tone === "danger" && "hover:border-bad hover:bg-bad/10 hover:text-bad",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Onglet segmenté. Même voix que les boutons, sans la profondeur. */
export function Tab({
  active,
  children,
  className,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      type={type}
      aria-selected={active}
      role="tab"
      className={cn("tab", active && "tab-active", className)}
      {...rest}
    >
      {children}
    </button>
  );
}
