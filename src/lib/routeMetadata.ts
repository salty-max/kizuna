import { locationDisplayName } from "@/domain/locations";
import type { Dataset } from "@/domain/types";
import {
  abilityDisplayName,
  bondDisplayName,
  equipmentDisplayName,
  playerDisplayName,
  tacticDisplayName,
  type Locale,
  type MessageKey,
  type Translator,
} from "@/i18n";

interface PageMetadata {
  title: string;
  description: string;
}

const WIKI_SECTIONS = {
  players: ["wiki.players", "wiki.playersHint"],
  abilities: ["wiki.abilities", "wiki.abilitiesHint"],
  equipment: ["wiki.equipment", "wiki.equipmentHint"],
  tactics: ["wiki.tactics", "wiki.tacticsHint"],
  passives: ["wiki.passives", "wiki.passivesHint"],
  bonds: ["wiki.bonds", "wiki.bondsHint"],
  locations: ["wiki.locations", "wiki.locationsHint"],
} as const satisfies Record<string, readonly [MessageKey, MessageKey]>;

function detailName(
  section: keyof typeof WIKI_SECTIONS,
  rawId: string,
  dataset: Dataset,
  locale: Locale,
  showOriginalNames: boolean,
): string | null {
  const id = decodeURIComponent(rawId);
  switch (section) {
    case "players": {
      const player = dataset.players.find((entry) => entry.id === Number(id));
      return player ? playerDisplayName(player, showOriginalNames, locale) : null;
    }
    case "abilities": {
      const ability = dataset.abilities.find((entry) => entry.id === id);
      return ability ? abilityDisplayName(ability, locale) : null;
    }
    case "equipment": {
      const item = dataset.equipment.find((entry) => entry.id === id);
      return item ? equipmentDisplayName(item, locale) : null;
    }
    case "tactics": {
      const tactic = dataset.tactics.find((entry) => entry.id === id);
      return tactic ? tacticDisplayName(tactic, locale) : null;
    }
    case "passives": {
      const passive = dataset.passives.find((entry) => entry.id === id);
      return passive ? `#${passive.number}` : null;
    }
    case "bonds": {
      const bond = dataset.synergies.find((entry) => entry.id === id);
      return bond ? bondDisplayName(bond, locale) : null;
    }
    case "locations": {
      const location = dataset.locations.find((entry) => entry.id === id);
      return location ? locationDisplayName(location, locale) : null;
    }
  }
}

/** Pure resolver kept separate from the DOM side effect so route coverage is testable. */
export function metadataForPath(
  pathname: string,
  dataset: Dataset,
  t: Translator["t"],
  locale: Locale,
  showOriginalNames: boolean,
): PageMetadata {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "wiki") {
    return { title: t("app.documentTitle"), description: t("app.documentDescription") };
  }

  const section = parts[1] as keyof typeof WIKI_SECTIONS | undefined;
  if (!section || !(section in WIKI_SECTIONS)) {
    return { title: `${t("wiki.title")} — Kizuna`, description: t("wiki.homeHint") };
  }

  const [labelKey, hintKey] = WIKI_SECTIONS[section];
  const sectionLabel = t(labelKey);
  const name = parts[2] ? detailName(section, parts[2], dataset, locale, showOriginalNames) : null;

  return {
    title: `${name ? `${name} · ${sectionLabel}` : sectionLabel} — Kizuna`,
    description: name ? `${name}. ${t(hintKey)}` : t(hintKey),
  };
}
