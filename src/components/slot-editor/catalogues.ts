import type { Equipment, EquipmentSlot, Passive, PassiveSource } from "@/domain/types";

export function groupPassivesBySource(passives: Passive[]) {
  const groups = new Map<PassiveSource, Passive[]>();

  for (const passive of passives) {
    const group = groups.get(passive.source);
    if (group) group.push(passive);
    else groups.set(passive.source, [passive]);
  }

  // The picker presents one row per passive family. Its value is rescaled to
  // the selected rarity when the player picks it, so only the top tier belongs
  // in the catalogue.
  for (const [source, group] of groups) {
    const byFamily = new Map<number, Passive>();
    const ungrouped: Passive[] = [];

    for (const passive of group) {
      if (passive.family == null) {
        ungrouped.push(passive);
        continue;
      }

      const previous = byFamily.get(passive.family);
      if (!previous || (passive.tier ?? 0) > (previous.tier ?? 0)) {
        byFamily.set(passive.family, passive);
      }
    }

    groups.set(
      source,
      [...byFamily.values(), ...ungrouped].sort(
        (left, right) => left.number - right.number || left.id.localeCompare(right.id),
      ),
    );
  }

  return groups;
}

export function groupEquipmentBySlot(equipment: Equipment[]) {
  const groups = new Map<EquipmentSlot, Equipment[]>();

  for (const item of equipment) {
    const group = groups.get(item.slot);
    if (group) group.push(item);
    else groups.set(item.slot, [item]);
  }

  for (const group of groups.values()) {
    group.sort((left, right) => right.total - left.total || left.name.localeCompare(right.name));
  }

  return groups;
}
