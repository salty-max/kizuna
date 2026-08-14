import { describe, expect, test } from "bun:test";

import { teamPosterInternals } from "./teamPoster";

describe("team poster", () => {
  test("builds a safe descriptive filename", () => {
    expect(teamPosterInternals.posterFilename("Équipe d'Aphrody !")).toBe(
      "kizuna-equipe-d-aphrody.png",
    );
    expect(teamPosterInternals.posterFilename("   ")).toBe("kizuna-team.png");
  });
});
