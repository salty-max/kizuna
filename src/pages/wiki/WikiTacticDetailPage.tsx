import { Link, useParams } from "react-router";

import { TacticIcon } from "@/components/GameIcon";
import { Callout, DataList, DataRow, Panel } from "@/components/ui";
import { useDataset } from "@/data/useDataset";
import { tacticDisplayDescription, tacticDisplayName, useI18n } from "@/i18n";
import { formatNumber } from "@/lib/ui";

export function WikiTacticDetailPage() {
  const { id: rawId } = useParams();
  const id = rawId ? decodeURIComponent(rawId) : "";
  const { t, locale } = useI18n();
  const dataset = useDataset();
  const tactic = dataset.tactics.find((x) => x.id === id) ?? null;

  if (!tactic) {
    return (
      <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">
        <Panel title={t("wiki.tactics")}>
          <Callout tone="warn">{t("wiki.notFound")}</Callout>
          <Link to="/wiki/tactics" className="mt-3 inline-block text-sm text-bolt-ink">
            {t("wiki.backToList")}
          </Link>
        </Panel>
      </div>
    );
  }

  const name = tacticDisplayName(tactic, locale);
  const description = tacticDisplayDescription(tactic, locale);

  return (
    <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <Link to="/wiki" className="text-ink-500 no-underline hover:text-bolt-ink">
          {t("wiki.title")}
        </Link>
        <span className="text-ink-700">/</span>
        <Link to="/wiki/tactics" className="text-ink-500 no-underline hover:text-bolt-ink">
          {t("wiki.tactics")}
        </Link>
        <span className="text-ink-700">/</span>
        <span className="truncate text-ink-300">{name}</span>
      </div>

      <Panel
        title={
          <span className="flex items-center gap-2">
            <TacticIcon tacticId={tactic.id} size={24} title={name} />
            <span className="truncate">{name}</span>
          </span>
        }
        bodyClassName="flex flex-col gap-4"
      >
        {description && <p className="text-sm whitespace-pre-line text-ink-200">{description}</p>}

        <DataList>
          <DataRow
            label={t("wiki.field.id")}
            value={<code className="text-xs">{tactic.id}</code>}
          />
          <DataRow
            label={t("wiki.field.tpCost")}
            value={
              tactic.tpCost >= 99999
                ? "∞"
                : t("app.tacticTp", { n: formatNumber(tactic.tpCost, locale) })
            }
          />
        </DataList>
      </Panel>
    </div>
  );
}
