import type { DetectedBond, EquippedSynergies } from "@/domain/bonds";
import type { BondSynergy } from "@/domain/types";
import { bondDisplayDescription, bondDisplayName, useI18n } from "@/i18n";
import { cn } from "@/lib/ui";
import { Panel, Select } from "../ui";

interface Props {
  synergies: BondSynergy[];
  offensiveSynergyId: string | null;
  defensiveSynergyId: string | null;
  equipped: EquippedSynergies;
  onChange: (ids: { offensiveSynergyId: string | null; defensiveSynergyId: string | null }) => void;
}

export function SynergyAttachmentsSection({
  synergies,
  offensiveSynergyId,
  defensiveSynergyId,
  equipped,
  onChange,
}: Props) {
  const { t, locale } = useI18n();

  const renderSlot = (
    kind: BondSynergy["kind"],
    value: string | null,
    resolved: DetectedBond | null,
  ) => {
    const catalogue = synergies.filter((item) => item.kind === kind);
    const label = kind === "offensive" ? t("synergy.offensive") : t("synergy.defensive");

    return (
      <div className="flex flex-col gap-1">
        <span className="label-display text-ink-500">{label}</span>
        <Select
          value={value ?? ""}
          searchable
          searchPlaceholder={t("editor.search")}
          emptyLabel={t("editor.searchEmpty")}
          placeholder={t("synergy.attachmentEmpty")}
          aria-label={label}
          options={[
            { value: "", label: t("synergy.attachmentEmpty") },
            ...catalogue.map((item) => ({
              value: item.id,
              label: bondDisplayName(item, locale),
            })),
          ]}
          onChange={(id) =>
            onChange({
              offensiveSynergyId: kind === "offensive" ? id || null : offensiveSynergyId,
              defensiveSynergyId: kind === "defensive" ? id || null : defensiveSynergyId,
            })
          }
        />
        {resolved ? <EquippedSynergyRow bond={resolved} /> : null}
      </div>
    );
  };

  return (
    <Panel title={t("synergy.attachments")} bodyClassName="flex flex-col gap-3">
      {renderSlot("offensive", offensiveSynergyId, equipped.offensive)}
      {renderSlot("defensive", defensiveSynergyId, equipped.defensive)}
      <p className="text-[11px] text-ink-500">{t("synergy.buffDataUnavailable")}</p>
    </Panel>
  );
}

function EquippedSynergyRow({ bond }: { bond: DetectedBond }) {
  const { t, locale } = useI18n();
  const missingNames = bond.missing.map((id) => {
    const index = bond.synergy.members.indexOf(id);
    return bond.synergy.memberNames[index] ?? `#${id}`;
  });

  return (
    <BondRow
      name={bondDisplayName(bond.synergy, locale)}
      description={bondDisplayDescription(bond.synergy, locale)}
      members={bond.synergy.memberNames}
      present={bond.present.length}
      total={bond.synergy.members.length}
      active={bond.status === "active"}
      statusLabel={
        bond.status === "active"
          ? t("synergy.attachmentActive")
          : t("synergy.bondsMissing", { list: missingNames.join(", ") })
      }
    />
  );
}

function BondRow({
  name,
  description,
  members,
  present,
  total,
  active,
  statusLabel,
}: {
  name: string;
  description: string;
  members: string[];
  present: number;
  total: number;
  active?: boolean;
  statusLabel?: string;
}) {
  return (
    <div
      className={cn(
        "border-2 px-2 py-1.5",
        active ? "border-[var(--color-good)]/50 bg-[var(--color-good)]/5" : "border-ink-800",
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-display text-sm font-bold uppercase italic">{name}</span>
        <span className="shrink-0 text-[11px] text-ink-500 tnum">
          {present}/{total}
        </span>
      </div>
      <p className="mt-0.5 text-[11px] text-ink-400">{members.join(" · ")}</p>
      {description ? (
        <p className="mt-0.5 line-clamp-2 text-[11px] text-ink-500">{description}</p>
      ) : null}
      {statusLabel ? (
        <p
          className={cn(
            "mt-0.5 text-[11px]",
            active ? "text-[var(--color-good)]" : "text-amber-400/80",
          )}
        >
          {statusLabel}
        </p>
      ) : null}
    </div>
  );
}
