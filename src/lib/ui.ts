import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import {
  HERO_VARIANT_LABELS,
  RARITY_LABELS,
  heroVariantFor,
  type BuildType,
  type Element,
  type Rarity,
} from "@/domain/types";

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
 * Fūrinkazan — the four elements are written with the kanji the games use.
 * Wind, forest, fire, mountain: 風林火山.
 */
export const ELEMENT_KANJI: Record<Element, string> = {
  Wind: "風",
  Forest: "林",
  Fire: "火",
  Mountain: "山",
};

export const ELEMENT_LABELS: Record<Element, string> = {
  Fire: "Feu",
  Wind: "Vent",
  Forest: "Forêt",
  Mountain: "Montagne",
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
   * Colour of the card's hard drop shadow. Rarity reads twice on a card —
   * edge and shadow — which is what lets the pitch be scanned without labels.
   */
  shadow: string;
}

const RARITY_STYLE_BY_KEY: Record<string, RarityStyle> = {
  common: {
    badge: "bg-ink-800 text-ink-300",
    ring: "ring-ink-700",
    border: "border-ink-700",
    shadow: "shadow-[5px_6px_0_rgba(0,0,0,0.65)]",
  },
  rising: {
    badge: "bg-linear-to-r from-emerald-400 to-lime-300 text-ink-950",
    ring: "ring-emerald-400/70",
    border: "border-emerald-400",
    shadow: "shadow-[5px_6px_0_#1d5c2b]",
  },
  advanced: {
    badge: "bg-linear-to-r from-sky-400 to-cyan-300 text-ink-950",
    ring: "ring-sky-400/70",
    border: "border-sky-400",
    shadow: "shadow-[5px_6px_0_#0d4457]",
  },
  top: {
    badge: "bg-linear-to-r from-violet-400 to-fuchsia-300 text-ink-950",
    ring: "ring-violet-400/70",
    border: "border-violet-400",
    shadow: "shadow-[5px_6px_0_#3f1d63]",
  },
  legendary: {
    // Exactly the game's own rarity ribbon: #ED6700 → #FFF100.
    badge: "bg-linear-to-r from-[#ed6700] to-[#fff100] text-ink-950",
    ring: "ring-bolt-500/80",
    border: "border-bolt-500",
    shadow: "shadow-[5px_6px_0_#7a4a00]",
  },
  "hero:red": {
    // And the other one: #EB0000 → #FF8200.
    badge: "bg-linear-to-r from-[#eb0000] to-[#ff8200] text-ink-950",
    ring: "ring-flare-500/80",
    border: "border-flare-500",
    shadow: "shadow-[5px_6px_0_#6b1000]",
  },
  "hero:silver": {
    badge: "bg-linear-to-r from-slate-300 to-slate-100 text-ink-950",
    ring: "ring-slate-300/80",
    border: "border-slate-300",
    shadow: "shadow-[5px_6px_0_#3b4250]",
  },
  "hero:pink": {
    badge: "bg-linear-to-r from-pink-400 to-rose-300 text-ink-950",
    ring: "ring-pink-400/80",
    border: "border-pink-400",
    shadow: "shadow-[5px_6px_0_#6b1a3d]",
  },
  // Archetype unknown, so no variant colour to key off.
  "hero:unknown": {
    badge: "bg-linear-to-r from-fuchsia-500 to-fuchsia-300 text-ink-950",
    ring: "ring-fuchsia-400/70",
    border: "border-fuchsia-400",
    shadow: "shadow-[5px_6px_0_#4d1052]",
  },
  basara: {
    badge: "bg-linear-to-r from-cyan-300 to-emerald-200 text-ink-950",
    ring: "ring-cyan-300/80",
    border: "border-cyan-300",
    shadow: "shadow-[5px_6px_0_#04544a]",
  },
};

export function rarityStyle(rarity: Rarity, buildType: BuildType | null): RarityStyle {
  if (rarity !== "hero") return RARITY_STYLE_BY_KEY[rarity]!;
  return RARITY_STYLE_BY_KEY[`hero:${heroVariantFor(buildType) ?? "unknown"}`]!;
}

/** Full label, resolving Hero to its variant. */
export function rarityLabel(rarity: Rarity, buildType: BuildType | null): string {
  if (rarity !== "hero") return RARITY_LABELS[rarity];
  const variant = heroVariantFor(buildType);
  return variant ? HERO_VARIANT_LABELS[variant] : "Hero";
}

/** Signed percentage, trimmed of trailing zeros: 12 → "+12 %", -3.5 → "−3,5 %". */
export function formatPercent(value: number): string {
  if (value === 0) return "—";
  const rounded = Math.round(value * 100) / 100;
  const body = String(Math.abs(rounded)).replace(".", ",");
  return `${rounded > 0 ? "+" : "−"}${body} %`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(value));
}

export function formatSigned(value: number): string {
  if (value === 0) return "±0";
  return `${value > 0 ? "+" : "−"}${formatNumber(Math.abs(value))}`;
}
