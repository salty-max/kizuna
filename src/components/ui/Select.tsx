import { Select as BaseSelect } from "@base-ui/react/select";
import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { Check, ChevronDown, Search } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { cn } from "@/lib/ui";

/**
 * Select / Combobox du design system, branché sur Base UI.
 *
 * L'API publique reste la même qu'avant le refactor (value string + options) :
 * les call sites (formation, rareté, équipements, passifs…) ne bougent pas.
 *
 * - `searchable` → Combobox (listes longues : bottes, passifs)
 * - sinon → Select (listes courtes : formation, rareté, langue)
 *
 * La popup est portalisée hors de `Panel` (`overflow-hidden`) et du rail qui
 * défile. `modal={false}` laisse le reste de la page scrollable pendant
 * qu'on parcourt une liste d'équipement.
 */

export interface SelectOption<T extends string = string> {
  value: T;
  /** Affiché dans le déclencheur, et ce sur quoi porte la recherche. */
  label: string;
  /** Rendu enrichi dans la liste (icône, description). À défaut, `label`. */
  render?: ReactNode;
  disabled?: boolean;
}

interface Props<T extends string> {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  /** Champ de recherche dans le déclencheur. Pour les listes longues seulement. */
  searchable?: boolean;
  /** Placeholder du champ de recherche une fois ouvert. */
  searchPlaceholder?: string;
  /** Affiché quand aucune option ne correspond à `value`. */
  placeholder?: string;
  emptyLabel?: string;
  "aria-label"?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
  size?: "sm" | "md";
}

const LIST_MAX_HEIGHT = 288;

/**
 * Comparaison sans casse ni accents : sur un catalogue français, chercher
 * « etrangers » doit trouver « Étrangers », sinon la recherche est un piège.
 */
function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

const popupClass =
  "z-100 origin-[var(--transform-origin)] border-2 border-bolt-400 bg-ink-950 py-0.5 shadow-[6px_7px_0_#000000cc] outline-none";

const itemClass =
  "flex cursor-pointer items-center gap-2 px-2 py-1 text-xs outline-none data-highlighted:bg-bolt-400/20 data-highlighted:text-bolt-400 data-selected:font-bold data-disabled:cursor-not-allowed data-disabled:opacity-40";

export function Select<T extends string>({
  value,
  options,
  onChange,
  searchable = false,
  searchPlaceholder,
  placeholder = "—",
  emptyLabel = "—",
  className,
  disabled,
  size = "md",
  id,
  ...aria
}: Props<T>) {
  if (searchable) {
    return (
      <SearchableSelect
        value={value}
        options={options}
        onChange={onChange}
        searchPlaceholder={searchPlaceholder}
        placeholder={placeholder}
        emptyLabel={emptyLabel}
        className={className}
        disabled={disabled}
        size={size}
        id={id}
        aria-label={aria["aria-label"]}
      />
    );
  }

  return (
    <PlainSelect
      value={value}
      options={options}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      size={size}
      id={id}
      aria-label={aria["aria-label"]}
    />
  );
}

function fieldClass(size: "sm" | "md", className?: string, open?: boolean) {
  return cn(
    "field flex w-full items-center gap-2 text-left",
    size === "sm" && "h-[var(--control-h-sm)] px-2 text-xs",
    open && "border-bolt-400",
    className,
  );
}

function PlainSelect<T extends string>({
  value,
  options,
  onChange,
  placeholder,
  className,
  disabled,
  size,
  id,
  "aria-label": ariaLabel,
}: {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder: string;
  className?: string;
  disabled?: boolean;
  size: "sm" | "md";
  id?: string;
  "aria-label"?: string;
}) {
  // Base UI wants `{ value, label }[]` for Value lookup; keep full options for render.
  const items = useMemo(() => options.map((o) => ({ value: o.value, label: o.label })), [options]);

  return (
    <BaseSelect.Root
      value={value}
      onValueChange={(next) => {
        if (next != null) onChange(next as T);
      }}
      items={items}
      disabled={disabled}
      modal={false}
    >
      <BaseSelect.Trigger
        id={id}
        aria-label={ariaLabel}
        className={(state) =>
          cn(
            fieldClass(size, className, state.open),
            "group justify-between",
            disabled && "opacity-40",
          )
        }
      >
        <BaseSelect.Value className="min-w-0 truncate" placeholder={placeholder} />
        <BaseSelect.Icon className="shrink-0 text-ink-500">
          <ChevronDown className="size-3.5 transition-transform group-data-[popup-open]:rotate-180" />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>

      <BaseSelect.Portal>
        <BaseSelect.Positioner
          className="z-100 outline-none"
          sideOffset={2}
          alignItemWithTrigger={false}
          align="start"
          side="bottom"
        >
          <BaseSelect.Popup className={popupClass} style={{ minWidth: "var(--anchor-width)" }}>
            <BaseSelect.List
              className="scroll-slim max-h-72 overflow-y-auto outline-none"
              style={{ maxHeight: LIST_MAX_HEIGHT }}
            >
              {options.map((option) => (
                <BaseSelect.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className={itemClass}
                >
                  <BaseSelect.ItemText className="min-w-0 flex-1 truncate">
                    {option.render ?? option.label}
                  </BaseSelect.ItemText>
                  <BaseSelect.ItemIndicator className="shrink-0 text-bolt-400">
                    <Check className="size-3.5" />
                  </BaseSelect.ItemIndicator>
                </BaseSelect.Item>
              ))}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}

/**
 * Searchable list: closed trigger shows the selection; filter lives in the
 * popup (Base UI "input inside popup"). Avoids the previous trap where the
 * input overwrote the selected label while typing.
 */
function SearchableSelect<T extends string>({
  value,
  options,
  onChange,
  searchPlaceholder,
  placeholder,
  emptyLabel,
  className,
  disabled,
  size,
  id,
  "aria-label": ariaLabel,
}: {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  searchPlaceholder?: string;
  placeholder: string;
  emptyLabel: string;
  className?: string;
  disabled?: boolean;
  size: "sm" | "md";
  id?: string;
  "aria-label"?: string;
}) {
  const selected = options.find((o) => o.value === value) ?? null;

  // Accent-insensitive contains — default Base UI filter is too strict for FR.
  const filter = useMemo(
    () => (itemValue: SelectOption<T>, query: string) => {
      if (!query.trim()) return true;
      return fold(itemValue.label).includes(fold(query.trim()));
    },
    [],
  );

  return (
    <BaseCombobox.Root
      value={selected}
      onValueChange={(next) => {
        if (next) onChange(next.value);
      }}
      items={options}
      itemToStringLabel={(item: SelectOption<T>) => item.label}
      isItemEqualToValue={(a: SelectOption<T>, b: SelectOption<T>) => a.value === b.value}
      filter={filter}
      disabled={disabled}
      modal={false}
    >
      <BaseCombobox.Trigger
        id={id}
        aria-label={ariaLabel}
        className={(state) =>
          cn(
            fieldClass(size, className, state.open),
            "group justify-between",
            disabled && "opacity-40",
          )
        }
      >
        <span className={cn("min-w-0 truncate", !selected && "text-ink-500")}>
          {selected?.label ?? placeholder}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-ink-500">
          <Search className="size-3.5" aria-hidden="true" />
          <ChevronDown className="size-3.5 transition-transform group-data-[popup-open]:rotate-180" />
        </span>
      </BaseCombobox.Trigger>

      <BaseCombobox.Portal>
        <BaseCombobox.Positioner
          className="z-100 outline-none"
          sideOffset={2}
          align="start"
          side="bottom"
        >
          <BaseCombobox.Popup
            className={popupClass}
            style={{ minWidth: "var(--anchor-width)", width: "max(var(--anchor-width), 16rem)" }}
            aria-label={ariaLabel}
          >
            <div className="border-b-2 border-ink-800 p-1.5">
              <BaseCombobox.Input
                placeholder={searchPlaceholder ?? placeholder}
                className="field h-[var(--control-h-sm)] w-full px-2 text-xs"
              />
            </div>
            <BaseCombobox.Empty className="px-2 py-2 text-xs text-ink-500">
              {emptyLabel}
            </BaseCombobox.Empty>
            <BaseCombobox.List
              className="scroll-slim overflow-y-auto outline-none"
              style={{ maxHeight: LIST_MAX_HEIGHT }}
            >
              {(option: SelectOption<T>) => (
                <BaseCombobox.Item
                  key={option.value}
                  value={option}
                  disabled={option.disabled}
                  className={itemClass}
                >
                  <span className="min-w-0 flex-1 truncate">{option.render ?? option.label}</span>
                  <BaseCombobox.ItemIndicator className="shrink-0 text-bolt-400">
                    <Check className="size-3.5" />
                  </BaseCombobox.ItemIndicator>
                </BaseCombobox.Item>
              )}
            </BaseCombobox.List>
          </BaseCombobox.Popup>
        </BaseCombobox.Positioner>
      </BaseCombobox.Portal>
    </BaseCombobox.Root>
  );
}
