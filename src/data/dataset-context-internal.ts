import { createContext } from "react";

import type { Dataset } from "@/domain/types";

export interface DatasetState {
  dataset: Dataset;
}

export const DatasetContext = createContext<DatasetState | null>(null);
