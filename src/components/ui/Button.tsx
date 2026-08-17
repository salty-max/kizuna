import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/ui";

/**
 * Buttons.
 *
 * The depth does not come from here: `.pressable` carries the shadow and the
 * press gesture, a tint utility says its colour. It is the same composition as
 * the player cards, so the two depress exactly alike without sharing any code —
 * which is the whole point.
 */

type Variant = "default" | "primary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md";
  /** Icon before the label. On its own, prefer `IconButton`. */
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
 * A link that has to look like a button. It really is an `<a>`: it navigates,
 * so it must open in a tab, be copyable, announce itself as a link. Only the
 * appearance is borrowed.
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
  /** Required: a button with no text must name itself for accessibility. */
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

/** Segmented tab. Same voice as the buttons, without the depth. */
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
