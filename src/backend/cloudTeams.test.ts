import { describe, expect, test } from "bun:test";

import { createTeam } from "@/domain/team";
import { encodeShareCode } from "@/lib/share";
import { restoreCloudTeam, type CloudTeam } from "./cloudTeams";

describe("cloud teams", () => {
  test("restores the same versioned payload used by local sharing", () => {
    const team = { ...createTeam(), name: "Onze du cloud" };
    const entry: CloudTeam = {
      id: crypto.randomUUID(),
      name: team.name,
      slug: "a".repeat(32),
      visibility: "private",
      payload: encodeShareCode(team),
      savedAt: "2026-08-13T20:00:00.000Z",
    };

    expect(restoreCloudTeam(entry)).toEqual(team);
  });

  test("rejects a corrupted cloud payload", () => {
    expect(
      restoreCloudTeam({
        id: crypto.randomUUID(),
        name: "Cassée",
        slug: "b".repeat(32),
        visibility: "private",
        payload: "KZ1.invalid",
        savedAt: "2026-08-13T20:00:00.000Z",
      }),
    ).toBeNull();
  });
});
