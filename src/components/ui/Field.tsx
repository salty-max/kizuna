import type { InputHTMLAttributes, ReactNode, Ref } from "react";

import { cn } from "@/lib/ui";

/**
 * Contrôles de formulaire.
 *
 * `Field` porte la mise en page label + contrôle, que le SlotEditor répétait à
 * la main avec une largeur de label différente à chaque section. Le label a une
 * largeur fixe pour que les contrôles s'alignent verticalement dans un panneau.
 */

export function Field({
  label,
  children,
  hint,
  labelWidth = "w-16",
}: {
  label: ReactNode;
  children: ReactNode;
  hint?: ReactNode;
  labelWidth?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-center gap-2">
        <span className={cn("label-display shrink-0", labelWidth)}>{label}</span>
        {children}
      </span>
      {hint && (
        <span className="pl-[calc(var(--spacing)*18)] text-[11px] text-ink-500">{hint}</span>
      )}
    </label>
  );
}

/** `ref` est une prop ordinaire depuis React 19 — pas besoin de `forwardRef`. */
export function TextInput({
  className,
  ref,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return <input ref={ref} className={cn("field", className)} {...rest} />;
}

/** Saisie numérique alignée à droite, en chiffres tabulaires. */
export function NumberInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="number" className={cn("field text-right tnum", className)} {...rest} />;
}
