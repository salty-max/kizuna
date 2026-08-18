import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import {
  heroVariantFor,
  type BuildType,
  type Element,
  type HeroVariant,
  type Rarity,
} from "@/domain/types";
import type { Locale } from "@/i18n";
import { LOCALE_INTL } from "@/i18n";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ElementStyle {
  text: string;
  bg: string;
  ring: string;
  border: string;
}

export const ELEMENT_STYLES: Record<Element, ElementStyle> = {
  Fire: {
    text: "text-[var(--color-fire)]",
    bg: "bg-[var(--color-fire)]/15",
    ring: "ring-[var(--color-fire)]/50",
    border: "border-[var(--color-fire)]/40",
  },
  Wind: {
    text: "text-[var(--color-wind)]",
    bg: "bg-[var(--color-wind)]/15",
    ring: "ring-[var(--color-wind)]/50",
    border: "border-[var(--color-wind)]/40",
  },
  Forest: {
    text: "text-[var(--color-forest)]",
    bg: "bg-[var(--color-forest)]/15",
    ring: "ring-[var(--color-forest)]/50",
    border: "border-[var(--color-forest)]/40",
  },
  Mountain: {
    text: "text-[var(--color-mountain)]",
    bg: "bg-[var(--color-mountain)]/15",
    ring: "ring-[var(--color-mountain)]/50",
    border: "border-[var(--color-mountain)]/40",
  },
};

/**
 * Fūrinkazan — the four elements written as the games write them.
 * Kept as a non-localised mark (風林火山), not a UI string.
 */
export const ELEMENT_KANJI: Record<Element, string> = {
  Wind: "風",
  Forest: "林",
  Fire: "火",
  Mountain: "山",
};

/**
 * Positions are deliberately monochrome. Colour is a scarce signal and it is
 * spent on rarity, which is the thing you actually compare across a squad — a
 * position is already spelled out in two letters and needs no hue.
 */
export const POSITION_STYLE = "border-ink-700 bg-ink-800 text-ink-300";

/**
 * Rarity colours read as a progression up to Legendary. Hero is not one colour
 * but three, and those three are the game's own — red, silver, pink, keyed to
 * the character's archetype — so they are reproduced rather than invented.
 * Basara gets the diamond it is nicknamed after.
 */
export interface RarityStyle {
  /** Badge: the game's own gradient ribbon, with ink dark enough to read on it. */
  badge: string;
  /** Ring around a portrait, where one is still wanted. */
  ring: string;
  /** Border alone — how a squad card carries its tier. */
  border: string;
  /**
   * Tint of the hard shadow, not the shadow itself: the class redefines
   * `--shadow-hard-color` and lets `.pressable` compose the `box-shadow`.
   * This is what lets a card depress exactly like a button while keeping its
   * rarity colour. Rarity reads twice on a card — the border and the shadow —
   * which makes the pitch legible without text.
   */
  shadow: string;
}

const RARITY_STYLE_BY_KEY: Record<string, RarityStyle> = {
  common: {
    badge: "bg-ink-800 text-ink-300",
    ring: "ring-ink-700",
    border: "border-ink-700",
    shadow: "[--shadow-hard-color:var(--rarity-shadow-common)]",
  },
  rising: {
    badge: "bg-linear-to-r from-emerald-400 to-lime-300 text-ink-950",
    ring: "ring-emerald-400/70",
    border: "border-emerald-400",
    shadow: "[--shadow-hard-color:var(--rarity-shadow-rising)]",
  },
  advanced: {
    badge: "bg-linear-to-r from-sky-400 to-cyan-300 text-ink-950",
    ring: "ring-sky-400/70",
    border: "border-sky-400",
    shadow: "[--shadow-hard-color:var(--rarity-shadow-advanced)]",
  },
  top: {
    badge: "bg-linear-to-r from-violet-400 to-fuchsia-300 text-ink-950",
    ring: "ring-violet-400/70",
    border: "border-violet-400",
    shadow: "[--shadow-hard-color:var(--rarity-shadow-top)]",
  },
  legendary: {
    // Exactly the game's own rarity ribbon: #ED6700 → #FFF100.
    badge: "bg-linear-to-r from-[#ed6700] to-[#fff100] text-ink-950",
    ring: "ring-bolt-500/80",
    border: "border-bolt-500",
    shadow: "[--shadow-hard-color:var(--rarity-shadow-legendary)]",
  },
  "hero:red": {
    // And the other one: #EB0000 → #FF8200. The edge takes the ribbon's own red
    // rather than the structural colour: borrowing it turned this border blue
    // the day that colour stopped being vermilion, on a badge still gradient-red.
    badge: "bg-linear-to-r from-[#eb0000] to-[#ff8200] text-ink-950",
    ring: "ring-[#eb0000]/80",
    border: "border-[#eb0000]",
    shadow: "[--shadow-hard-color:var(--rarity-shadow-hero-red)]",
  },
  "hero:silver": {
    badge: "bg-linear-to-r from-slate-300 to-slate-100 text-ink-950",
    ring: "ring-slate-300/80",
    border: "border-slate-300",
    shadow: "[--shadow-hard-color:var(--rarity-shadow-hero-silver)]",
  },
  "hero:pink": {
    badge: "bg-linear-to-r from-pink-400 to-rose-300 text-ink-950",
    ring: "ring-pink-400/80",
    border: "border-pink-400",
    shadow: "[--shadow-hard-color:var(--rarity-shadow-hero-pink)]",
  },
  // Archetype unknown, so no variant colour to key off.
  "hero:unknown": {
    badge: "bg-linear-to-r from-fuchsia-500 to-fuchsia-300 text-ink-950",
    ring: "ring-fuchsia-400/70",
    border: "border-fuchsia-400",
    shadow: "[--shadow-hard-color:var(--rarity-shadow-hero-unknown)]",
  },
  basara: {
    badge: "bg-linear-to-r from-cyan-300 to-emerald-200 text-ink-950",
    ring: "ring-cyan-300/80",
    border: "border-cyan-300",
    shadow: "[--shadow-hard-color:var(--rarity-shadow-basara)]",
  },
};

export function rarityStyle(rarity: Rarity, buildType: BuildType | null): RarityStyle {
  if (rarity !== "hero") return RARITY_STYLE_BY_KEY[rarity]!;
  return RARITY_STYLE_BY_KEY[`hero:${heroVariantFor(buildType) ?? "unknown"}`]!;
}

/**
 * Resolve the Hero colour variant for a rarity display. Labels themselves live
 * in i18n — call `rarityLabelKey` / `heroVariantLabel` with `t`.
 */
export function heroVariantOf(rarity: Rarity, buildType: BuildType | null): HeroVariant | null {
  return rarity === "hero" ? heroVariantFor(buildType) : null;
}

/** Signed percentage; decimal separator follows locale (`,` for fr, `.` for en/ja). */
export function formatPercent(value: number, locale: Locale = "fr"): string {
  if (value === 0) return "—";
  const rounded = Math.round(value * 100) / 100;
  const sep = locale === "fr" ? "," : ".";
  const body = String(Math.abs(rounded)).replace(".", sep);
  return `${rounded > 0 ? "+" : "−"}${body} %`;
}

export function formatNumber(value: number, locale: Locale = "fr"): string {
  return new Intl.NumberFormat(LOCALE_INTL[locale]).format(Math.round(value));
}

export function formatSigned(value: number, locale: Locale = "fr"): string {
  if (value === 0) return "±0";
  return `${value > 0 ? "+" : "−"}${formatNumber(Math.abs(value), locale)}`;
}

export function formatDateTime(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleString(LOCALE_INTL[locale]);
}
