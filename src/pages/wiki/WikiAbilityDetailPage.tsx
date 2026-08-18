import { Link, useParams } from "react-router";

import { AbilityIcon, ElementBadge } from "@/components/GameIcon";
import { Callout, DataList, DataRow, Panel } from "@/components/ui";
import { useDataset } from "@/data/useDataset";
import { abilityDisplayDescription, abilityDisplayName, useI18n } from "@/i18n";
import { abilityTypeLabel, elementLabel } from "@/i18n/labels";
import { formatNumber } from "@/lib/ui";

export function WikiAbilityDetailPage() {
  const { id: rawId } = useParams();
  const id = rawId ? decodeURIComponent(rawId) : "";
  const { t, locale } = useI18n();
  const dataset = useDataset();
  const ability = dataset.abilities.find((a) => a.id === id) ?? null;

  if (!ability) {
    return (
      <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">
        <Panel title={t("wiki.abilities")}>
          <Callout tone="warn">{t("wiki.notFound")}</Callout>
          <Link to="/wiki/abilities" className="mt-3 inline-block text-sm text-bolt-ink">
            {t("wiki.backToList")}
          </Link>
        </Panel>
      </div>
    );
  }

  const name = abilityDisplayName(ability, locale);
  const description = abilityDisplayDescription(ability, locale);

  return (
    <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <Link to="/wiki" className="text-ink-500 no-underline hover:text-bolt-ink">
          {t("wiki.title")}
        </Link>
        <span className="text-ink-700">/</span>
        <Link to="/wiki/abilities" className="text-ink-500 no-underline hover:text-bolt-ink">
          {t("wiki.abilities")}
        </Link>
        <span className="text-ink-700">/</span>
        <span className="truncate text-ink-300">{name}</span>
      </div>

      <Panel
        title={
          <span className="flex items-center gap-2">
            <AbilityIcon ability={ability} size={22} />
            <span className="truncate">{name}</span>
          </span>
        }
        bodyClassName="flex flex-col gap-4"
      >
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="border-2 border-ink-700 bg-ink-950 px-2 py-0.5 font-display text-[11px] font-bold uppercase italic">
            {t(`wiki.kind.${ability.kind}` as "wiki.kind.hissatsu")}
          </span>
          <span className="text-ink-400">{abilityTypeLabel(t, ability.type)}</span>
          {ability.element && <ElementBadge element={ability.element} variant="full" size={16} />}
        </div>
        {description && <p className="text-sm whitespace-pre-line text-ink-200">{description}</p>}
        <DataList>
          <DataRow
            label={t("wiki.field.id")}
            value={<code className="text-xs">{ability.id}</code>}
          />
          <DataRow
            label={t("wiki.field.power")}
            value={ability.power > 0 ? formatNumber(ability.power, locale) : "—"}
          />
          <DataRow
            label={t("wiki.field.tension")}
            value={ability.tension > 0 ? `${formatNumber(ability.tension, locale)} TP` : "—"}
          />
          {ability.element && (
            <DataRow label={t("wiki.field.element")} value={elementLabel(t, ability.element)} />
          )}
          {ability.auraType && (
            <DataRow
              label={t("wiki.field.auraType")}
              value={t(`editor.auraTypes.${ability.auraType}` as "editor.auraTypes.keshin")}
            />
          )}
          {ability.shop && <DataRow label={t("wiki.field.shop")} value={ability.shop} />}
          {ability.extra && <DataRow label={t("wiki.field.extra")} value={ability.extra} />}
        </DataList>
        {(ability.names.fr || ability.names.en || ability.names.ja) && (
          <div>
            <p className="label-display mb-1 text-ink-500">{t("wiki.field.names")}</p>
            <DataList>
              {ability.names.fr && <DataRow label="FR" value={ability.names.fr} />}
              {ability.names.en && <DataRow label="EN" value={ability.names.en} />}
              {ability.names.ja && <DataRow label="JA" value={ability.names.ja} />}
            </DataList>
          </div>
        )}{" "}
      </Panel>
    </div>
  );
}
