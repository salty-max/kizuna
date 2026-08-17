import type { InputHTMLAttributes, ReactNode, Ref } from "react";

import { cn } from "@/lib/ui";

/**
 * Form controls.
 *
 * `Field` carries the label + control layout, which the SlotEditor repeated by
 * hand with a different label width in every section. The label has a fixed
 * width so controls line up vertically within a panel.
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

/** `ref` is an ordinary prop as of React 19 — no `forwardRef` needed. */
export function TextInput({
  className,
  ref,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return <input ref={ref} className={cn("field", className)} {...rest} />;
}

/** Right-aligned numeric input, in tabular figures. */
export function NumberInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="number" className={cn("field text-right tnum", className)} {...rest} />;
}
