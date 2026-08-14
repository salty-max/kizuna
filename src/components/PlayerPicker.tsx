import { useDeferredValue, useMemo, useRef, useState } from "react";

import type { Dataset, Player, Position } from "@/domain/types";
import { useI18n } from "@/i18n";
import { filterAndSortPlayers, type PlayerFilters } from "./player-picker/filterPlayers";
import { PlayerPickerControls } from "./player-picker/PlayerPickerControls";
import { PlayerPickerResults } from "./player-picker/PlayerPickerResults";
import { useDialogFocus } from "./useDialogFocus";

interface Props {
  dataset: Dataset;
  /** Highlighted as the shape's intent; never used to restrict the list. */
  suggestedPosition: Position | null;
  onPick: (player: Player) => void;
  onClose: () => void;
}

export function PlayerPicker({ dataset, suggestedPosition, onPick, onClose }: Props) {
  const { t, showOriginalNames } = useI18n();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Omit<PlayerFilters, "query">>({
    position: suggestedPosition,
    element: null,
    buildType: null,
    game: null,
    team: null,
    gender: null,
    spiritOnly: false,
    heroForm: false,
    basaraForm: false,
    sort: "total",
  });
  const deferredQuery = useDeferredValue(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useDialogFocus<HTMLDivElement>(onClose, inputRef);

  const results = useMemo(
    () => filterAndSortPlayers(dataset.players, { ...filters, query: deferredQuery }),
    [dataset.players, deferredQuery, filters],
  );

  const updateFilters = (patch: Partial<PlayerFilters>) => {
    if (patch.query !== undefined) setQuery(patch.query);
    const { query: _query, ...selectionPatch } = patch;
    if (Object.keys(selectionPatch).length > 0) {
      setFilters((current) => ({ ...current, ...selectionPatch }));
    }
  };

  return (
    <div
      className="overlay flex items-start justify-center p-4 sm:p-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="modal max-w-4xl"
        role="dialog"
        aria-modal="true"
        aria-label={t("picker.search")}
      >
        <PlayerPickerControls
          dataset={dataset}
          filters={{ ...filters, query }}
          inputRef={inputRef}
          onChange={updateFilters}
          onClose={onClose}
        />
        <PlayerPickerResults
          players={results}
          totalPlayers={dataset.players.length}
          imageBase={dataset.imageBase}
          sort={filters.sort}
          showOriginalNames={showOriginalNames}
          onPick={onPick}
        />
      </div>
    </div>
  );
}
