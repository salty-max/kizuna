import { useDeferredValue, useMemo, useState } from "react";
import { Link } from "react-router";
import { Search } from "lucide-react";

import { AbilityIcon, ElementBadge, HissatsuIcon } from "@/components/GameIcon";
import { FilterChip, Panel, PanelHint, PanelMeta, Select } from "@/components/ui";
import { useDataset } from "@/data/useDataset";
import type { Ability, AbilityKind, AuraType, Element } from "@/domain/types";
import { AURA_TYPES, ELEMENTS } from "@/domain/types";
import { abilityDisplayName, localizedSearchBlob, useI18n } from "@/i18n";
import { abilityTypeLabel, auraTypeLabel } from "@/i18n/labels";
import { cn, formatNumber } from "@/lib/ui";

const KINDS: AbilityKind[] = ["hissatsu", "auraHissatsu", "aura"];
const HISSATSU_TYPES = ["Shoot", "Dribble", "Block", "Catch"] as const;

/** One chip = one mutually exclusive category (hissatsu type *or* aura mechanic). */
type CategoryFilter =
  | { kind: "all" }
  | { kind: "hissatsu"; type: (typeof HISSATSU_TYPES)[number] }
  | { kind: "aura"; auraType: AuraType };

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function matchesCategory(ability: Ability, category: CategoryFilter): boolean {
  if (category.kind === "all") return true;
  if (category.kind === "hissatsu") return ability.type === category.type;
  return ability.auraType === category.auraType;
}

/** Searchable catalogue of hissatsu + auras. */
export function WikiAbilitiesPage() {
  const { t, locale } = useI18n();
  const dataset = useDataset();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<AbilityKind | "">("");
  const [category, setCategory] = useState<CategoryFilter>({ kind: "all" });
  const [element, setElement] = useState<Element | "">("");
  const deferredQuery = useDeferredValue(query);

  const results = useMemo(() => {
    const needle = fold(deferredQuery.trim());
    return dataset.abilities
      .filter((ability) => {
        if (kind && ability.kind !== kind) return false;
        if (!matchesCategory(ability, category)) return false;
        if (element && ability.element !== element) return false;
        if (!needle) return true;
        return (
          fold(localizedSearchBlob(ability.names, ability.name)).includes(needle) ||
          fold(localizedSearchBlob(ability.descriptions, ability.description)).includes(needle) ||
          ability.id.includes(needle)
        );
      })
      .sort((a, b) => {
        const byPower = b.power - a.power;
        if (byPower !== 0) return byPower;
        return abilityDisplayName(a, locale).localeCompare(abilityDisplayName(b, locale), locale);
      });
  }, [dataset.abilities, deferredQuery, kind, category, element, locale]);

  return (
    <div className="scroll-slim flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs">
        <Link to="/wiki" className="text-ink-500 no-underline hover:text-bolt-400">
          {t("wiki.title")}
        </Link>
        <span className="text-ink-700">/</span>
        <span className="text-ink-300">{t("wiki.abilities")}</span>
      </div>

      <Panel
        title={t("wiki.abilities")}
        action={
          <PanelMeta>{t("wiki.count", { n: formatNumber(results.length, locale) })}</PanelMeta>
        }
        bodyClassName="flex min-h-0 flex-1 flex-col gap-3"
        className="flex min-h-0 flex-1 flex-col"
      >
        <PanelHint>{t("wiki.abilitiesHint")}</PanelHint>

        <div className="flex flex-wrap items-center gap-2">
          <div className="field relative flex min-w-[12rem] flex-1 items-center gap-2">
            <Search className="size-3.5 shrink-0 text-ink-500" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("wiki.search")}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-500"
              aria-label={t("wiki.search")}
            />
          </div>
          <Select
            value={kind}
            onChange={(v) => setKind(v as AbilityKind | "")}
            className="w-40"
            aria-label={t("wiki.filterKind")}
            options={[
              { value: "", label: t("wiki.allKinds") },
              ...KINDS.map((k) => ({
                value: k,
                label: t(`wiki.kind.${k}` as "wiki.kind.hissatsu"),
              })),
            ]}
          />
        </div>

        {/* One exclusive category: hissatsu type XOR aura mechanic. */}
        <div className="flex flex-wrap gap-1" role="group" aria-label={t("wiki.filterType")}>
          <FilterChip active={category.kind === "all"} onClick={() => setCategory({ kind: "all" })}>
            {t("wiki.allTypes")}
          </FilterChip>
          {HISSATSU_TYPES.map((ty) => (
            <FilterChip
              key={ty}
              active={category.kind === "hissatsu" && category.type === ty}
              onClick={() => setCategory({ kind: "hissatsu", type: ty })}
              title={abilityTypeLabel(t, ty)}
            >
              <HissatsuIcon category={ty} size={16} title={abilityTypeLabel(t, ty)} />
              <span className="hidden sm:inline">{abilityTypeLabel(t, ty)}</span>
            </FilterChip>
          ))}
          {AURA_TYPES.map((at) => (
            <FilterChip
              key={at}
              active={category.kind === "aura" && category.auraType === at}
              onClick={() => setCategory({ kind: "aura", auraType: at })}
              title={auraTypeLabel(t, at)}
            >
              <AbilityIcon ability={{ kind: "aura", type: "Aura", auraType: at }} size={16} />
              <span className="hidden sm:inline">{auraTypeLabel(t, at)}</span>
            </FilterChip>
          ))}
        </div>

        <div className="flex flex-wrap gap-1" role="group" aria-label={t("wiki.allElements")}>
          <FilterChip active={element === ""} onClick={() => setElement("")}>
            {t("wiki.allElements")}
          </FilterChip>
          {ELEMENTS.map((el) => (
            <FilterChip key={el} active={element === el} onClick={() => setElement(el)}>
              <ElementBadge element={el} variant="icon" size={14} />
            </FilterChip>
          ))}
        </div>

        <ul className="scroll-slim min-h-0 flex-1 divide-y divide-ink-850 overflow-y-auto border-2 border-ink-800">
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-xs text-ink-500">{t("wiki.empty")}</li>
          ) : (
            results.map((ability) => <AbilityRow key={ability.id} ability={ability} />)
          )}
        </ul>
      </Panel>
    </div>
  );
}

function AbilityRow({ ability }: { ability: Ability }) {
  const { t, locale } = useI18n();
  const name = abilityDisplayName(ability, locale);
  const categoryLabel =
    ability.auraType != null
      ? auraTypeLabel(t, ability.auraType)
      : abilityTypeLabel(t, ability.type);

  return (
    <li>
      <Link
        to={`/wiki/abilities/${encodeURIComponent(ability.id)}`}
        className={cn(
          "flex items-center gap-3 px-3 py-2 no-underline transition-colors",
          "hover:bg-ink-850",
        )}
      >
        <AbilityIcon ability={ability} size={22} />
        {ability.element && <ElementBadge element={ability.element} variant="icon" size={16} />}
        <span className="min-w-0 flex-1 truncate font-display text-sm font-bold uppercase italic">
          {name}
        </span>
        <span className="shrink-0 text-[11px] text-ink-500">{categoryLabel}</span>
        {ability.power > 0 && (
          <span className="w-12 shrink-0 text-right text-sm font-semibold tnum text-ink-200">
            {ability.power}
          </span>
        )}
        {ability.tension > 0 && (
          <span className="w-14 shrink-0 text-right text-[11px] text-ink-500 tnum">
            {ability.tension} TP
          </span>
        )}
      </Link>
    </li>
  );
}
