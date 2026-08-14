import { squadShape } from "@/domain/synergy";
import type { ResolvedTeam } from "@/domain/team";
import type { BuildType, Element, Position } from "@/domain/types";
import { playerDisplayName, useI18n } from "@/i18n";
import {
  buildTypeLabel,
  elementLabel,
  rarityLabelKey,
  ruleNoticeLabel,
  violationLabel,
} from "@/i18n/labels";
import { ELEMENT_STYLES, cn, rarityStyle } from "@/lib/ui";
import { ElementBadge, PositionBadge, StyleBadge } from "../GameIcon";
import { Callout, Chip, Panel, PanelMeta } from "../ui";

export function CompositionSection({ resolved }: { resolved: ResolvedTeam }) {
  const { t, locale, showOriginalNames } = useI18n();
  const shape = squadShape(resolved);

  return (
    <Panel
      title={t("synergy.composition")}
      action={
        <PanelMeta>
          {t("synergy.starters", { filled: shape.filled, capacity: shape.capacity })}
        </PanelMeta>
      }
      bodyClassName="flex flex-col gap-2"
    >
      <Distribution
        label={t("synergy.rarities")}
        entries={shape.rarities.map(({ rarity, count }) => ({
          key: rarity,
          label: rarityLabelKey(t, rarity),
          count,
          className: rarityStyle(rarity, null).badge,
        }))}
        total={shape.filled}
      />
      <Distribution
        label={t("synergy.elements")}
        entries={shape.elements.map(({ element, count }) => ({
          key: element,
          label: elementLabel(t, element as Element),
          count,
          className: cn(
            ELEMENT_STYLES[element as Element].bg,
            ELEMENT_STYLES[element as Element].text,
          ),
          icon: <ElementBadge element={element as Element} variant="icon" size={14} />,
        }))}
        total={shape.filled}
      />
      <Distribution
        label={t("synergy.positions")}
        entries={shape.positions.map(({ position, count }) => ({
          key: position,
          label: position,
          count,
          className: "bg-ink-850 text-ink-200",
          icon: <PositionBadge position={position as Position} variant="silhouette" size={14} />,
        }))}
        total={shape.filled}
      />
      {shape.buildTypes.length > 0 && (
        <Distribution
          label={t("synergy.archetypes")}
          entries={shape.buildTypes.map(({ buildType, count }) => ({
            key: buildType,
            label: buildTypeLabel(t, buildType as BuildType),
            count,
            className: "bg-ink-800 text-ink-300",
            icon: <StyleBadge buildType={buildType as BuildType} variant="icon" size={14} />,
          }))}
          total={shape.filled}
        />
      )}

      {shape.violations.map((violation) => (
        <Callout key={violation.code} tone="bad">
          {violationLabel(t, violation)}
        </Callout>
      ))}
      {shape.notices.map((notice) => (
        <Callout key={notice.code} tone="info">
          {ruleNoticeLabel(t, notice)}
        </Callout>
      ))}
      {shape.outOfPosition.length > 0 && (
        <Callout tone="warn">
          {t("synergy.outOfPosition", {
            n: shape.outOfPosition.length,
            list: shape.outOfPosition
              .map((slot) =>
                t("synergy.outOfPositionItem", {
                  name: playerDisplayName(slot.player, showOriginalNames, locale) || "?",
                  from: slot.player?.position ?? "?",
                  to: slot.expectedPosition ?? "?",
                }),
              )
              .join(", "),
          })}
        </Callout>
      )}
    </Panel>
  );
}

function Distribution({
  label,
  entries,
  total,
}: {
  label: string;
  entries: {
    key: string;
    label: string;
    count: number;
    className: string;
    icon?: React.ReactNode;
  }[];
  total: number;
}) {
  if (entries.length === 0) return null;

  return (
    <div>
      <p className="label-display mb-1">{label}</p>
      <div className="flex flex-wrap gap-1">
        {entries.map((entry) => (
          <Chip
            key={entry.key}
            icon={entry.icon}
            className={cn("border-ink-700", entry.className)}
            title={`${entry.label}: ${entry.count}/${total}`}
          >
            {!entry.icon && entry.label}
            <span className="font-semibold tnum">{entry.count}</span>
          </Chip>
        ))}
      </div>
    </div>
  );
}
