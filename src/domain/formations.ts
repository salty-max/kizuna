import type { Position } from "./types";

/**
 * Les huit formations de Victory Road, avec leurs positions officielles.
 *
 * Les coordonnées ne sont pas dessinées à la main : elles sont extraites des
 * marqueurs de https://zukan.inazuma.jp/en/soccer_formation/, où chaque poste
 * est un `left: x%; top: y%`. Deux transformations ont été appliquées à la
 * génération :
 *
 *  - l'axe vertical est retourné, pour que `y = 0` soit son propre but ;
 *  - `y` est renormalisé sur 0–100, parce que le site n'occupe que la moitié
 *    basse de son terrain et laisse 40 % de vide au-dessus.
 *
 * `position` est l'intention de la formation, déduite de son nom (4-4-2 → 4 DF,
 * 4 MF, 2 FW) : Victory Road laisse aligner n'importe qui n'importe où, donc le
 * builder signale un joueur hors poste sans jamais le refuser.
 */

export interface FormationSlot {
  id: string;
  position: Position;
  /** 0 côté gauche … 100 côté droit. */
  x: number;
  /** 0 à son propre but … 100 au but adverse. */
  y: number;
}

export interface Formation {
  id: string;
  name: string;
  slots: FormationSlot[];
}

export const FORMATIONS: Formation[] = [
  {
    id: "4-4-2-diamond",
    name: "4-4-2 Diamond",
    slots: [
      { id: "gk", position: "GK", x: 50, y: 0 },
      { id: "df1", position: "DF", x: 41.5, y: 13 },
      { id: "df2", position: "DF", x: 58.5, y: 13 },
      { id: "df3", position: "DF", x: 20, y: 21.7 },
      { id: "df4", position: "DF", x: 80, y: 21.7 },
      { id: "mf1", position: "MF", x: 50, y: 34.8 },
      { id: "mf2", position: "MF", x: 27.5, y: 56.5 },
      { id: "mf3", position: "MF", x: 72.5, y: 56.5 },
      { id: "mf4", position: "MF", x: 50, y: 87 },
      { id: "fw1", position: "FW", x: 22.5, y: 100 },
      { id: "fw2", position: "FW", x: 77.5, y: 100 },
    ],
  },
  {
    id: "4-4-2-box",
    name: "4-4-2 Box",
    slots: [
      { id: "gk", position: "GK", x: 50, y: 0 },
      { id: "df1", position: "DF", x: 41.5, y: 13 },
      { id: "df2", position: "DF", x: 58.5, y: 13 },
      { id: "df3", position: "DF", x: 20, y: 21.7 },
      { id: "df4", position: "DF", x: 80, y: 21.7 },
      { id: "mf1", position: "MF", x: 37.5, y: 39.1 },
      { id: "mf2", position: "MF", x: 62.5, y: 39.1 },
      { id: "mf3", position: "MF", x: 25, y: 69.6 },
      { id: "mf4", position: "MF", x: 75, y: 69.6 },
      { id: "fw1", position: "FW", x: 40, y: 100 },
      { id: "fw2", position: "FW", x: 60, y: 100 },
    ],
  },
  {
    id: "3-5-2-freedom",
    name: "3-5-2 Freedom",
    slots: [
      { id: "gk", position: "GK", x: 50, y: 0 },
      { id: "df1", position: "DF", x: 27.5, y: 17.4 },
      { id: "df2", position: "DF", x: 50, y: 17.4 },
      { id: "df3", position: "DF", x: 72.5, y: 17.4 },
      { id: "mf1", position: "MF", x: 37.5, y: 43.5 },
      { id: "mf2", position: "MF", x: 62.5, y: 43.5 },
      { id: "mf3", position: "MF", x: 17.5, y: 60.9 },
      { id: "mf4", position: "MF", x: 82.5, y: 60.9 },
      { id: "mf5", position: "MF", x: 50, y: 78.3 },
      { id: "fw1", position: "FW", x: 37.5, y: 100 },
      { id: "fw2", position: "FW", x: 62.5, y: 100 },
    ],
  },
  {
    id: "4-3-3-triangle",
    name: "4-3-3 Triangle",
    slots: [
      { id: "gk", position: "GK", x: 50, y: 0 },
      { id: "df1", position: "DF", x: 35, y: 21.7 },
      { id: "df2", position: "DF", x: 65, y: 21.7 },
      { id: "df3", position: "DF", x: 17.5, y: 28.3 },
      { id: "df4", position: "DF", x: 82.5, y: 28.3 },
      { id: "mf1", position: "MF", x: 40, y: 47.8 },
      { id: "mf2", position: "MF", x: 60, y: 47.8 },
      { id: "mf3", position: "MF", x: 50, y: 69.6 },
      { id: "fw1", position: "FW", x: 20, y: 78.3 },
      { id: "fw2", position: "FW", x: 80, y: 78.3 },
      { id: "fw3", position: "FW", x: 50, y: 100 },
    ],
  },
  {
    id: "4-3-3-delta",
    name: "4-3-3 Delta",
    slots: [
      { id: "gk", position: "GK", x: 50, y: 0 },
      { id: "df1", position: "DF", x: 37.5, y: 17.4 },
      { id: "df2", position: "DF", x: 62.5, y: 17.4 },
      { id: "df3", position: "DF", x: 15, y: 32.6 },
      { id: "df4", position: "DF", x: 85, y: 32.6 },
      { id: "mf1", position: "MF", x: 50, y: 39.1 },
      { id: "mf2", position: "MF", x: 37.5, y: 69.6 },
      { id: "mf3", position: "MF", x: 62.5, y: 69.6 },
      { id: "fw1", position: "FW", x: 20, y: 82.6 },
      { id: "fw2", position: "FW", x: 80, y: 82.6 },
      { id: "fw3", position: "FW", x: 50, y: 100 },
    ],
  },
  {
    id: "4-5-1-balanced",
    name: "4-5-1 Balanced",
    slots: [
      { id: "gk", position: "GK", x: 50, y: 0 },
      { id: "df1", position: "DF", x: 40, y: 19.5 },
      { id: "df2", position: "DF", x: 60, y: 19.5 },
      { id: "df3", position: "DF", x: 16, y: 26.5 },
      { id: "df4", position: "DF", x: 84, y: 26.5 },
      { id: "mf1", position: "MF", x: 42.5, y: 48.7 },
      { id: "mf2", position: "MF", x: 57.5, y: 48.7 },
      { id: "mf3", position: "MF", x: 20, y: 70.8 },
      { id: "mf4", position: "MF", x: 80, y: 70.8 },
      { id: "mf5", position: "MF", x: 50, y: 79.6 },
      { id: "fw1", position: "FW", x: 50, y: 100 },
    ],
  },
  {
    id: "3-6-1-hexa",
    name: "3-6-1 Hexa",
    slots: [
      { id: "gk", position: "GK", x: 50, y: 0 },
      { id: "df1", position: "DF", x: 50, y: 16.7 },
      { id: "df2", position: "DF", x: 25, y: 18.3 },
      { id: "df3", position: "DF", x: 75, y: 18.3 },
      { id: "mf1", position: "MF", x: 12.5, y: 45.8 },
      { id: "mf2", position: "MF", x: 87.5, y: 45.8 },
      { id: "mf3", position: "MF", x: 37.5, y: 47.5 },
      { id: "mf4", position: "MF", x: 62.5, y: 47.5 },
      { id: "mf5", position: "MF", x: 25, y: 72.9 },
      { id: "mf6", position: "MF", x: 75, y: 72.9 },
      { id: "fw1", position: "FW", x: 50, y: 100 },
    ],
  },
  {
    id: "5-4-1-double-volante",
    name: "5-4-1 Double Volante",
    slots: [
      { id: "gk", position: "GK", x: 50, y: 0 },
      { id: "df1", position: "DF", x: 50, y: 13.6 },
      { id: "df2", position: "DF", x: 27.5, y: 18.2 },
      { id: "df3", position: "DF", x: 72.5, y: 18.2 },
      { id: "df4", position: "DF", x: 12.5, y: 27.3 },
      { id: "df5", position: "DF", x: 87.5, y: 27.3 },
      { id: "mf1", position: "MF", x: 37.5, y: 40.9 },
      { id: "mf2", position: "MF", x: 62.5, y: 40.9 },
      { id: "mf3", position: "MF", x: 25, y: 68.2 },
      { id: "mf4", position: "MF", x: 75, y: 68.2 },
      { id: "fw1", position: "FW", x: 50, y: 100 },
    ],
  },
];

export const DEFAULT_FORMATION = FORMATIONS[0]!;

export function findFormation(id: string): Formation {
  return FORMATIONS.find((f) => f.id === id) ?? DEFAULT_FORMATION;
}

/** Squad slots that sit outside the pitch shape. */
export const BENCH_SIZE = 5;
export const COORDINATOR_SIZE = 3;

export const BENCH_SLOT_IDS = Array.from({ length: BENCH_SIZE }, (_, i) => `bench${i + 1}`);
export const COORDINATOR_SLOT_IDS = Array.from(
  { length: COORDINATOR_SIZE },
  (_, i) => `coord${i + 1}`,
);
export const MANAGER_SLOT_ID = "manager";
