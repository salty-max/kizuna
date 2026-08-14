import { MAX_TEAM_TACTICS } from "@/domain/types";

export function tacticSlots(tacticIds: string[]) {
  return Array.from({ length: MAX_TEAM_TACTICS }, (_, index) => tacticIds[index] ?? "");
}

export function updateTacticSlot(tacticIds: string[], index: number, id: string) {
  const slots = tacticSlots(tacticIds);
  slots[index] = id;
  return slots.filter(Boolean).slice(0, MAX_TEAM_TACTICS);
}
