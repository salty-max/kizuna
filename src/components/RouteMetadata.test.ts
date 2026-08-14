import { describe, expect, test } from "bun:test";

import type { Ability, Dataset, Equipment, Player } from "@/domain/types";
import { createTranslator } from "@/i18n";
import { metadataForPath } from "@/lib/routeMetadata";

const dataset: Dataset = {
  players: [
    {
      id: 1,
      name: "Mark Evans",
      names: { en: "Mark Evans", fr: "Mark Evans", ja: "円堂 守" },
      nameOriginal: "Endo Mamoru",
    } as Player,
  ],
  abilities: [
    {
      id: "fire-tornado",
      name: "Fire Tornado",
      names: { en: "Fire Tornado", fr: "Tornade de feu" },
    } as Ability,
  ],
  equipment: [
    {
      id: "boots-test",
      name: "Test Boots",
      names: { en: "Test Boots", fr: "Crampons test" },
    } as Equipment,
  ],
  passives: [],
  tactics: [],
  synergies: [],
  games: [],
  imageBase: "",
  generatedAt: "2026-08-13T00:00:00.000Z",
};

const { t } = createTranslator("en");

describe("metadataForPath", () => {
  test("uses the product metadata for the builder", () => {
    const metadata = metadataForPath("/", dataset, t, "en", false);
    expect(metadata.title).toContain("Victory Road team builder");
    expect(metadata.description).toContain("tournament rules");
  });

  test("gives every catalogue its own title and description", () => {
    expect(metadataForPath("/wiki/equipment", dataset, t, "en", false)).toEqual({
      title: "Equipment — Kizuna",
      description: "Boots, pendants, bracelets and accessories.",
    });
  });

  test("uses the localised entity name on detail routes", () => {
    expect(metadataForPath("/wiki/players/1", dataset, t, "en", false).title).toBe(
      "Mark Evans · Players — Kizuna",
    );
    expect(metadataForPath("/wiki/abilities/fire-tornado", dataset, t, "fr", false).title).toBe(
      "Tornade de feu · Moves — Kizuna",
    );
  });

  test("honours the original-name preference in a player title", () => {
    expect(metadataForPath("/wiki/players/1", dataset, t, "en", true).title).toBe(
      "Endo Mamoru · Players — Kizuna",
    );
  });
});
