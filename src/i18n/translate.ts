import type { Locale } from "./locales";
import { en } from "./messages/en";
import { fr, type Messages } from "./messages/fr";
import { ja } from "./messages/ja";

const CATALOGS: Record<Locale, Messages> = { fr, en, ja };

/** Dot-path keys into the message tree, e.g. `app.loading`. */
export type MessageKey = PathsToString<Messages>;

type PathsToString<T, P extends string = ""> = T extends string
  ? P extends ""
    ? never
    : P
  : {
      [K in Extract<keyof T, string>]: PathsToString<T[K], P extends "" ? K : `${P}.${K}`>;
    }[Extract<keyof T, string>];

type Params = Record<string, string | number>;

function lookup(messages: Messages, key: string): string | undefined {
  const parts = key.split(".");
  let node: unknown = messages;
  for (const part of parts) {
    if (node == null || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    params[name] !== undefined ? String(params[name]) : `{${name}}`,
  );
}

/**
 * Pick a plural form when `{key}_other` exists and `count !== 1`.
 * French/English use 1 vs rest; Japanese catalogs duplicate the same string.
 */
function resolveKey(messages: Messages, key: MessageKey, params?: Params): string {
  const count = params?.n ?? params?.count;
  if (typeof count === "number" && count !== 1) {
    const other = lookup(messages, `${key}_other`);
    if (other !== undefined) return interpolate(other, params);
  }
  const value = lookup(messages, key);
  if (value === undefined) {
    if (import.meta.env.DEV) console.warn(`[i18n] missing key: ${key}`);
    return key;
  }
  return interpolate(value, params);
}

export function createTranslator(locale: Locale) {
  const messages = CATALOGS[locale];

  function t(key: MessageKey, params?: Params): string {
    return resolveKey(messages, key, params);
  }

  return { t, messages, locale };
}

export type Translator = ReturnType<typeof createTranslator>;
