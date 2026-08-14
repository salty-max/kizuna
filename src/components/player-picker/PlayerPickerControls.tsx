import { useMemo, type RefObject } from "react";
import { Search, X } from "lucide-react";

import { POWER_KEYS } from "@/domain/stats";
import {
  BUILD_TYPES,
  ELEMENTS,
  GENDERS,
  POSITIONS,
  type Dataset,
  type Gender,
} from "@/domain/types";
import { teamDisplayName, teamFilterKey, useI18n } from "@/i18n";
import { buildTypeLabel, elementLabel, genderLabel, powerLabel } from "@/i18n/labels";
import { ELEMENT_STYLES, cn } from "@/lib/ui";
import { ElementBadge, GenderBadge, PositionBadge, StyleBadge } from "../GameIcon";
import { FilterChip, IconButton, Select, TextInput } from "../ui";
import type { PlayerFilters } from "./filterPlayers";

interface Props {
  dataset: Dataset;
  filters: PlayerFilters;
  inputRef: RefObject<HTMLInputElement | null>;
  onChange: (patch: Partial<PlayerFilters>) => void;
  onClose: () => void;
}

export function PlayerPickerControls({ dataset, filters, inputRef, onChange, onClose }: Props) {
  const { t, locale } = useI18n();
  const teams = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const player of dataset.players) {
      const key = teamFilterKey(player);
      if (!key || byKey.has(key)) continue;
      byKey.set(key, teamDisplayName(player, locale));
    }
    return [...byKey.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((left, right) => left.label.localeCompare(right.label, locale));
  }, [dataset.players, locale]);

  return (
    <>
      <header className="flex items-center gap-2 border-b-2 border-ink-800 p-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-500" />
          <TextInput
            ref={inputRef}
            value={filters.query}
            onChange={(event) => onChange({ query: event.target.value })}
            placeholder={t("picker.search")}
            aria-label={t("picker.search")}
            className="w-full pl-8"
          />
        </div>
        <IconButton onClick={onClose} aria-label={t("picker.close")}>
          <X className="size-4" />
        </IconButton>
      </header>

      <div className="flex flex-wrap items-center gap-1.5 border-b-2 border-ink-800 p-3">
        <FilterGroup
          values={POSITIONS}
          active={filters.position}
          onChange={(position) => onChange({ position })}
          label={() => ""}
          icon={(value) => <PositionBadge position={value} variant="badge" size={16} />}
          ariaLabel={(value) => value}
        />
        <Divider />
        <FilterGroup
          values={ELEMENTS}
          active={filters.element}
          onChange={(element) => onChange({ element })}
          label={(value) => elementLabel(t, value)}
          className={(value) => ELEMENT_STYLES[value].text}
          icon={(value) => <ElementBadge element={value} variant="icon" size={14} />}
        />
        <Divider />
        <FilterGroup
          values={BUILD_TYPES}
          active={filters.buildType}
          onChange={(buildType) => onChange({ buildType })}
          label={(value) => buildTypeLabel(t, value)}
          icon={(value) => <StyleBadge buildType={value} variant="icon" size={14} />}
        />
        <Divider />
        <span className="flex flex-wrap gap-1" role="group" aria-label={t("wiki.filterForms")}>
          <FilterChip
            active={filters.spiritOnly}
            onClick={() => onChange({ spiritOnly: !filters.spiritOnly })}
            aria-label={t("picker.spiritDrop")}
          >
            {t("picker.spiritDrop")}
          </FilterChip>
          <FilterChip
            active={filters.heroForm}
            onClick={() => onChange({ heroForm: !filters.heroForm })}
            aria-label={t("picker.hasHero")}
          >
            {t("picker.hasHero")}
          </FilterChip>
          <FilterChip
            active={filters.basaraForm}
            onClick={() => onChange({ basaraForm: !filters.basaraForm })}
            aria-label={t("picker.hasBasara")}
          >
            {t("picker.hasBasara")}
          </FilterChip>
        </span>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <Select
            value={filters.game ?? ""}
            options={[
              { value: "", label: t("picker.allGames") },
              ...dataset.games.map((name) => ({ value: name, label: name })),
            ]}
            onChange={(game) => onChange({ game: game || null })}
            aria-label={t("picker.allGames")}
            className="w-44"
          />
          <Select
            value={filters.team ?? ""}
            options={[{ value: "", label: t("picker.allTeams") }, ...teams]}
            onChange={(team) => onChange({ team: team || null })}
            aria-label={t("picker.allTeams")}
            className="w-48"
            searchable
            searchPlaceholder={t("picker.search")}
            emptyLabel={t("picker.none")}
          />
          <Select
            value={filters.gender ?? ""}
            options={[
              { value: "", label: t("picker.allGenders") },
              ...GENDERS.filter((gender) => gender !== "Unknown").map((gender) => ({
                value: gender,
                label: genderLabel(t, gender),
                render: (
                  <span className="flex items-center gap-1.5">
                    <GenderBadge gender={gender} size={14} />
                    <span>{genderLabel(t, gender)}</span>
                  </span>
                ),
              })),
            ]}
            onChange={(gender) => onChange({ gender: (gender as Gender) || null })}
            aria-label={t("picker.allGenders")}
            className="w-36"
          />
          <Select
            value={filters.sort}
            options={[
              { value: "total", label: t("picker.sortTotal") },
              ...POWER_KEYS.map((key) => ({
                value: key,
                label: t("picker.sortBy", { stat: powerLabel(t, key) }),
              })),
            ]}
            onChange={(sort) => onChange({ sort: sort as PlayerFilters["sort"] })}
            aria-label={t("picker.sortTotal")}
            className="w-40"
          />
        </div>
      </div>
    </>
  );
}

function Divider() {
  return <span className="divider-v" />;
}

function FilterGroup<T extends string>({
  values,
  active,
  onChange,
  label,
  className,
  icon,
  ariaLabel,
}: {
  values: readonly T[];
  active: T | null;
  onChange: (value: T | null) => void;
  label: (value: T) => string;
  className?: (value: T) => string;
  icon?: (value: T) => React.ReactNode;
  ariaLabel?: (value: T) => string;
}) {
  return (
    <span className="flex flex-wrap gap-1">
      {values.map((value) => {
        const selected = active === value;
        const text = label(value);
        return (
          <FilterChip
            key={value}
            active={selected}
            aria-label={ariaLabel?.(value) ?? text}
            onClick={() => onChange(selected ? null : value)}
            icon={icon?.(value)}
            className={cn(!selected && className?.(value))}
          >
            {text}
          </FilterChip>
        );
      })}
    </span>
  );
}
