import { useContext } from "react";

import type { Dataset } from "@/domain/types";
import { DatasetContext } from "./dataset-context-internal";

export function useDataset(): Dataset {
  const ctx = useContext(DatasetContext);
  if (!ctx) throw new Error("useDataset must be used under DatasetProvider");
  return ctx.dataset;
}
