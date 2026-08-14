import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router";

import { LanguageSwitch } from "@/components/LanguageSwitch";
import { Button, Panel } from "@/components/ui";
import type { Dataset } from "@/domain/types";
import { useI18n } from "@/i18n";
import { DatasetContext } from "./dataset-context-internal";
import { datasetShardsForPath, loadDataset, type DataShard } from "./load";

/**
 * Loads the shared game catalogue once for the whole app (builder + wiki).
 * Pages call `useDataset()` rather than re-fetching.
 */
export function DatasetProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const shardKey = datasetShardsForPath(pathname).join(",");
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setDataset(null);
    setError(null);
    const shards = shardKey ? (shardKey.split(",") as DataShard[]) : [];
    loadDataset(shards).then(
      (next) => {
        if (!cancelled) setDataset(next);
      },
      (err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt, shardKey]);

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-8">
        <Panel as="h2" title={t("app.loadError")} className="max-w-md text-left">
          <p className="text-xs text-ink-500">{error}</p>
          <p className="mt-3 text-xs text-ink-500">
            {t("app.loadErrorHint", { cmd: "bun run data", path: "public/data/" })}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => setAttempt((value) => value + 1)}>
              {t("app.retry")}
            </Button>
            <LanguageSwitch />
          </div>
        </Panel>
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-8">
        <p
          role="status"
          className="font-display text-sm font-bold tracking-wide text-ink-500 uppercase italic"
        >
          {t("app.loading")}
        </p>
      </div>
    );
  }

  return <DatasetContext.Provider value={{ dataset }}>{children}</DatasetContext.Provider>;
}
