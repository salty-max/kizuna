import { useMemo } from "react";
import { ExternalLink, Shirt, Trash2, UserPlus } from "lucide-react";

import { imageUrl } from "@/data/load";
import {
  POWER_FORMULAS,
  POWER_KEYS,
  POWER_LABELS,
  STAT_KEYS,
  STAT_LABELS,
  type PowerKey,
} from "@/domain/stats";
import { CONDITION_LABELS, type Modifier, type SynergyResult } from "@/domain/synergy";
import {
  MAX_SLOT_PASSIVES,
  passiveSourceFor,
  type ResolvedSlot,
  type SlotAssignment,
} from "@/domain/team";
import {
  BUILD_TYPES,
  BUILD_TYPE_LABELS,
  EQUIPMENT_SLOTS,
  EQUIPMENT_SLOT_LABELS,
  RARITIES,
  RARITY_SCALES,
  type BuildType,
  type Dataset,
  type Equipment,
  type EquipmentSlot,
  type Passive,
  type Rarity,
} from "@/domain/types";
import { ELEMENT_STYLES, POSITION_STYLE, cn, formatPercent, rarityLabel, rarityStyle } from "@/lib/ui";
import { ElementBadge } from "./ElementIcon";

interface Props {
  slot: ResolvedSlot;
  assignment: SlotAssignment;
  dataset: Dataset;
  synergy: SynergyResult;
  onChange: (next: SlotAssignment) => void;
  onOpenPicker: () => void;
}

export function SlotEditor({ slot, assignment, dataset, synergy, onChange, onOpenPicker }: Props) {
  const staffOnly = slot.kind === "manager" || slot.kind === "coordinator";

  const passivesBySource = useMemo(() => {
    const groups = new Map<string, Passive[]>();
    for (const passive of dataset.passives) {
      const group = groups.get(passive.source);
      if (group) group.push(passive);
      else groups.set(passive.source, [passive]);
    }
    for (const group of groups.values()) group.sort((a, b) => a.number - b.number);
    return groups;
  }, [dataset.passives]);

  const equipmentBySlot = useMemo(() => {
    const groups = new Map<EquipmentSlot, Equipment[]>();
    for (const item of dataset.equipment) {
      const group = groups.get(item.slot);
      if (group) group.push(item);
      else groups.set(item.slot, [item]);
    }
    for (const group of groups.values()) group.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
    return groups;
  }, [dataset.equipment]);

  const modifiers = synergy.power.get(slot.slotId);
  const effective = synergy.effective.get(slot.slotId);
  const potential = synergy.potential.get(slot.slotId);

  return (
    <div className="flex flex-col gap-4">
      {/* ── Identity ─────────────────────────────────────────────────────── */}
      <section className="panel p-3">
        {slot.player ? (
          <div className="flex items-start gap-3">
            <img
              src={imageUrl(dataset.imageBase, slot.player.image, 128)}
              alt=""
              width={64}
              height={64}
              className={cn(
                "size-16 shrink-0 rounded-lg object-cover ring-2 ring-inset",
                ELEMENT_STYLES[slot.player.element].ring,
                ELEMENT_STYLES[slot.player.element].bg,
              )}
            />

            <div className="min-w-0 flex-1">
              <h2 className="truncate font-semibold">{slot.player.name}</h2>
              <p className="truncate text-xs text-ink-500">{slot.player.game}</p>

              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className={cn("rounded border px-1.5 py-0.5 font-semibold", POSITION_STYLE)}>
                  {slot.player.position}
                </span>
                <ElementBadge element={slot.player.element} />
                <span className="text-ink-500">{slot.player.ageGroup}</span>
              </div>

              {!staffOnly && (
                <div className="mt-2 flex flex-col gap-1">
                  <label className="flex items-center gap-2">
                    <span className="w-14 shrink-0 text-xs text-ink-500">Rareté</span>
                    <select
                      value={assignment.rarity}
                      onChange={(event) =>
                        onChange({ ...assignment, rarity: event.target.value as Rarity })
                      }
                      className={cn(
                        "field min-w-0 flex-1 border py-1",
                        rarityStyle(assignment.rarity, slot.buildType).badge,
                      )}
                    >
                      {RARITIES.map((rarity) => (
                        <option key={rarity} value={rarity} className="bg-ink-950 text-ink-100">
                          {rarityLabel(rarity, slot.buildType)} ×{RARITY_SCALES[rarity].multiplier}
                          {RARITY_SCALES[rarity].flatBonus > 0 &&
                            ` +${RARITY_SCALES[rarity].flatBonus}/stat`}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex items-center gap-2">
                    <span className="w-14 shrink-0 text-xs text-ink-500">Archétype</span>
                    <select
                      value={assignment.buildType ?? ""}
                      onChange={(event) =>
                        onChange({
                          ...assignment,
                          buildType: (event.target.value || null) as BuildType | null,
                        })
                      }
                      className="field min-w-0 flex-1 py-1"
                    >
                      <option value="">
                        {slot.player.buildType
                          ? `Dataset : ${BUILD_TYPE_LABELS[slot.player.buildType]}`
                          : "Dataset : inconnu"}
                      </option>
                      {BUILD_TYPES.map((buildType) => (
                        <option key={buildType} value={buildType}>
                          {BUILD_TYPE_LABELS[buildType]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <p className="text-[11px] text-ink-500">
                    L'archétype dépend du drop, pas du personnage — et un Basara le laisse
                    reconfigurer. Il détermine la variante Hero.
                  </p>

                  {assignment.rarity === "hero" && !slot.buildType && (
                    <p className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-300">
                      Archétype non renseigné : impossible de déterminer la variante Hero (rouge,
                      argent ou rose). Choisis-en un ci-dessus.
                    </p>
                  )}

                  {RARITY_SCALES[assignment.rarity].estimated && (
                    <p className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-300">
                      Valeurs estimées : aucun multiplicateur Basara n'a été mesuré. Modélisé comme
                      Hero +5/stat, d'après l'écart de 30–40 points de total rapporté.
                    </p>
                  )}
                </div>
              )}

              {!slot.positionMatch && (
                <p className="mt-2 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-300">
                  Joueur {slot.player.position} placé sur un poste {slot.expectedPosition}.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <button type="button" onClick={onOpenPicker} className="btn px-2 py-1 text-xs">
                Changer
              </button>
              <button
                type="button"
                onClick={() => onChange({ ...assignment, playerId: null })}
                className="btn px-2 py-1 text-xs"
                aria-label="Vider le slot"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenPicker}
            className="btn btn-primary w-full justify-center py-3"
          >
            <UserPlus className="size-4" />
            Assigner un personnage
          </button>
        )}
      </section>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      {slot.player && !staffOnly && (
        <section className="panel overflow-hidden">
          <h3 className="panel-title">Stats de base</h3>
          <div className="p-3">
          <p className="mb-2 text-[11px] text-ink-500">
            {slot.rarity === "common"
              ? "Ligne Common du dataset. L'appoint vert vient de l'équipement."
              : `Ligne Common ×${RARITY_SCALES[slot.rarity].multiplier}` +
                (RARITY_SCALES[slot.rarity].flatBonus > 0
                  ? ` +${RARITY_SCALES[slot.rarity].flatBonus}`
                  : "") +
                ` (${rarityLabel(slot.rarity, slot.buildType)}), puis équipement.`}
          </p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {STAT_KEYS.map((key) => {
              // Rarity and equipment are separate layers: the multiplier applies
              // to the character, the equipment is flat on top.
              const equipmentBonus = slot.stats[key] - slot.scaledStats[key];
              const scaled = slot.rarity !== "common";
              return (
                <div key={key} className="flex items-baseline justify-between gap-2">
                  <dt className="truncate text-xs text-ink-500">{STAT_LABELS[key]}</dt>
                  <dd className="tnum font-medium">
                    {scaled && (
                      <span className="mr-1 text-[11px] font-normal text-ink-500">
                        {slot.player?.stats[key]} →
                      </span>
                    )}
                    {slot.stats[key]}
                    {equipmentBonus !== 0 && (
                      <span className="ml-1 text-[11px] text-[var(--color-good)]">
                        +{equipmentBonus}
                      </span>
                    )}
                  </dd>
                </div>
              );
            })}
            <div className="col-span-2 mt-1 flex items-baseline justify-between border-t border-ink-800 pt-1">
              <dt className="text-xs font-semibold text-ink-300">Total</dt>
              <dd className="tnum font-semibold">{slot.total}</dd>
            </div>
          </dl>
          </div>
        </section>
      )}

      {/* ── Power ────────────────────────────────────────────────────────── */}
      {slot.player && !staffOnly && modifiers && effective && potential && (
        <section className="panel overflow-hidden">
          <h3 className="panel-title">Puissances</h3>
          <div className="p-3">
          <p className="mb-2 text-[11px] text-ink-500">
            Base → avec passifs garantis. La valeur grise est le plafond conditionnel.
          </p>

          <table className="w-full text-sm">
            <tbody>
              {POWER_KEYS.map((key) => {
                const modifier = modifiers[key];
                const hasCeiling = potential[key] !== effective[key];
                return (
                  <tr key={key} className="border-t border-ink-850 first:border-0">
                    <th
                      scope="row"
                      title={POWER_FORMULAS[key]}
                      className="py-1 text-left text-xs font-normal text-ink-500 underline decoration-dotted underline-offset-2"
                    >
                      {POWER_LABELS[key]}
                    </th>
                    <td className="py-1 text-right text-xs text-ink-500 tnum">{slot.power[key]}</td>
                    <td className="py-1 text-right font-semibold tnum">
                      {effective[key]}
                      {hasCeiling && (
                        <span className="ml-1 text-[11px] font-normal text-ink-500">
                          → {potential[key]}
                        </span>
                      )}
                    </td>
                    <td className="w-16 py-1 text-right text-[11px] tnum">
                      {modifier.guaranteed !== 0 && (
                        <span className={modifier.guaranteed > 0 ? "text-[var(--color-good)]" : "text-[var(--color-bad)]"}>
                          {formatPercent(modifier.guaranteed)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <Contributions modifiers={modifiers} />
          </div>
        </section>
      )}

      {/* ── Equipment ────────────────────────────────────────────────────── */}
      {!staffOnly && (
        <section className="panel overflow-hidden">
          <h3 className="panel-title">Équipement</h3>
          <div className="p-3">
          <div className="flex flex-col gap-2">
            {EQUIPMENT_SLOTS.map((equipmentSlot) => {
              const items = equipmentBySlot.get(equipmentSlot) ?? [];
              const current = assignment.equipment[equipmentSlot] ?? "";
              const equipped = items.find((item) => item.id === current);
              return (
                <label key={equipmentSlot} className="flex items-center gap-2">
                  <EquipmentIcon item={equipped} />
                  <span className="w-16 shrink-0 text-xs text-ink-500">
                    {EQUIPMENT_SLOT_LABELS[equipmentSlot]}
                  </span>
                  <select
                    value={current}
                    onChange={(event) =>
                      onChange({
                        ...assignment,
                        equipment: {
                          ...assignment.equipment,
                          [equipmentSlot]: event.target.value || undefined,
                        },
                      })
                    }
                    className="field min-w-0 flex-1"
                  >
                    <option value="">—</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} (+{item.total})
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
          </div>
        </section>
      )}

      {/* ── Passives ─────────────────────────────────────────────────────── */}
      <section className="panel overflow-hidden">
        <h3 className="panel-title">Passifs</h3>
        <div className="p-3">
        <p className="mb-2 text-[11px] text-ink-500">
          Le jeu ne publie pas le passif porté par chaque personnage : à toi de le renseigner. La
          valeur dépend du niveau du passif — les bornes affichées sont les min/max du jeu.
        </p>

        <div className="flex flex-col gap-2">
          {Array.from({ length: MAX_SLOT_PASSIVES }, (_, index) => {
            const source = passiveSourceFor(slot.kind, index);
            const options = passivesBySource.get(source) ?? [];
            const current = assignment.passives[index] ?? { passiveId: null, value: 0 };
            const selected = options.find((p) => p.id === current.passiveId);

            return (
              <div key={index} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="w-20 shrink-0 text-xs text-ink-500">
                    {index === MAX_SLOT_PASSIVES - 1 ? "Custom" : `Preset ${index + 1}`}
                  </span>

                  <select
                    value={current.passiveId ?? ""}
                    onChange={(event) => {
                      const passiveId = event.target.value || null;
                      const next = options.find((p) => p.id === passiveId);
                      const passives = [...assignment.passives];
                      passives[index] = {
                        passiveId,
                        // Seed with the strong value so a freshly picked passive
                        // does something; it stays fully editable.
                        value: passiveId ? (next?.strongValue ?? 0) : 0,
                      };
                      onChange({ ...assignment, passives });
                    }}
                    className="field min-w-0 flex-1"
                  >
                    <option value="">—</option>
                    {options.map((passive) => (
                      <option key={passive.id} value={passive.id}>
                        #{passive.number} · {passive.description}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    step="0.1"
                    value={current.value || ""}
                    disabled={!current.passiveId}
                    onChange={(event) => {
                      const passives = [...assignment.passives];
                      passives[index] = {
                        passiveId: current.passiveId,
                        value: Number(event.target.value) || 0,
                      };
                      onChange({ ...assignment, passives });
                    }}
                    className="field w-20 text-right tnum"
                    aria-label="Valeur en pourcentage"
                  />
                  <span className="text-xs text-ink-500">%</span>
                </div>

                {selected && (
                  <p className="pl-22 text-[11px] text-ink-500">
                    Bornes du jeu : {selected.weakValue} % – {selected.strongValue} %
                    {selected.buildType && ` · build ${BUILD_TYPE_LABELS[selected.buildType]}`}
                    {selected.effects.some((e) => e.conditions.length > 0) && (
                      <span className="text-amber-400/80">
                        {" · "}
                        {selected.effects
                          .flatMap((e) => e.conditions)
                          .map((c) => CONDITION_LABELS[c])
                          .join(", ")}
                      </span>
                    )}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        </div>
      </section>

      {slot.player && (
        <a
          href={`https://zukan.inazuma.jp/en/`}
          target="_blank"
          rel="noreferrer noopener"
          className="btn justify-center text-xs"
        >
          Voir sur Inazugle
          <ExternalLink className="size-3.5" />
        </a>
      )}
    </div>
  );
}

/**
 * Item art comes from Inazugle and roughly one item in eight has no match, so
 * an empty frame is a normal state rather than a failure to signal.
 */
function EquipmentIcon({ item }: { item: Equipment | undefined }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-ink-800 bg-ink-950">
      {item?.image ? (
        <img
          src={item.image}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain"
        />
      ) : (
        <Shirt className={cn("size-4", item ? "text-ink-300" : "text-ink-700")} />
      )}
    </span>
  );
}

function Contributions({ modifiers }: { modifiers: Record<PowerKey, Modifier> }) {
  // One passive usually feeds several power stats; list each passive once.
  const seen = new Map<string, { description: string; from: string | null; percent: number; conditions: string[] }>();

  for (const modifier of Object.values(modifiers)) {
    for (const contribution of modifier.contributions) {
      const key = `${contribution.passiveId}:${contribution.fromSlotId}`;
      if (seen.has(key)) continue;
      seen.set(key, {
        description: contribution.description,
        from: contribution.fromPlayerName,
        percent: contribution.percent,
        conditions: [
          ...contribution.conditions.map((c) => CONDITION_LABELS[c]),
          ...(contribution.note ? [contribution.note] : []),
        ],
      });
    }
  }

  if (seen.size === 0) return null;

  return (
    <ul className="mt-2 flex flex-col gap-1 border-t border-ink-850 pt-2 text-[11px]">
      {[...seen.values()].map((entry, index) => (
        <li key={index} className="flex items-baseline gap-2">
          <span className={cn("shrink-0 tnum font-semibold", entry.percent > 0 ? "text-[var(--color-good)]" : "text-[var(--color-bad)]")}>
            {formatPercent(entry.percent)}
          </span>
          <span className="min-w-0 flex-1 text-ink-300">
            {entry.description}
            {entry.from && <span className="text-ink-500"> — {entry.from}</span>}
            {entry.conditions.length > 0 && (
              <span className="text-amber-400/70"> ({entry.conditions.join(", ")})</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
