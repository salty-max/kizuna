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
  abilityDisplayName,
  contributionPlayerName,
  playerDisplayName,
  playerInitials,
} from "./names";
export { createTranslator, type MessageKey, type Translator } from "./translate";
export type { Messages } from "./messages/fr";
