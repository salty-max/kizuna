export {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_INTL,
  LOCALE_LABELS,
  detectLocale,
  initialLocale,
  isLocale,
  type Locale,
} from "./locales";
export { LocaleProvider } from "./context";
export { useI18n, useT } from "./hooks";
export {
  abilityDisplayDescription,
  abilityDisplayName,
  bondDisplayDescription,
  bondDisplayName,
  contributionPlayerName,
  equipmentDisplayDescription,
  equipmentDisplayName,
  localizedSearchBlob,
  localizedText,
  matchesTeamFilter,
  passiveDisplayDescription,
  playerDetailDescription,
  playerCardName,
  playerDisplayName,
  playerInitials,
  tacticDisplayDescription,
  tacticDisplayName,
  teamDisplayName,
  teamFilterKey,
} from "./names";
export { createTranslator, type MessageKey, type Translator } from "./translate";
export type { Messages } from "./messages/fr";
