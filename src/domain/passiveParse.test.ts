import { describe, expect, test } from "bun:test";

import { parsePassiveEffectsFromEn } from "./passiveParse";

describe("parsePassiveEffectsFromEn", () => {
  test("team AT first half", () => {
    const effects = parsePassiveEffectsFromEn("Team AT +4% for the first half");
    expect(effects).toEqual([
      {
        scope: "team",
        stat: "AT",
        mode: "percent",
        direction: "increase",
        conditions: ["matchTimeHalfFirst"],
      },
    ]);
  });

  test("direct shot with bond condition", () => {
    const effects = parsePassiveEffectsFromEn(
      "When at 20% or more Bond Power, Team Direct Shot AT +4.5%",
    );
    expect(effects[0]?.stat).toBe("directShotAT");
    expect(effects[0]?.scope).toBe("team");
    expect(effects[0]?.conditions).toContain("bondPowerAtLeast20");
  });

  test("same-element scramble", () => {
    const effects = parsePassiveEffectsFromEn(
      "Scramble AT & DF +1.2% for players of the same element",
    );
    expect(effects[0]?.stat).toBe("scramble");
    expect(effects[0]?.scope).toBe("alliesSameElement");
  });

  test("own half personal scramble", () => {
    const effects = parsePassiveEffectsFromEn("Own Scramble AT & DF +12% in own half");
    expect(effects[0]?.stat).toBe("scramble");
    expect(effects[0]?.scope).toBe("self");
    expect(effects[0]?.conditions).toContain("fieldZoneOwnHalf");
  });

  test("foul rate decrease", () => {
    const effects = parsePassiveEffectsFromEn("When outside the zone, Team Foul Rate -16%");
    expect(effects[0]?.stat).toBe("foulRate");
    expect(effects[0]?.direction).toBe("decrease");
    expect(effects[0]?.conditions).toContain("outsideZoneArea");
  });

  test("tactic cooldown self", () => {
    const effects = parsePassiveEffectsFromEn("Own Special Tactics Cooldown -8%");
    expect(effects[0]?.stat).toBe("tacticCooldown");
    expect(effects[0]?.scope).toBe("self");
    expect(effects[0]?.direction).toBe("decrease");
  });

  test("bond power gain on pass", () => {
    const effects = parsePassiveEffectsFromEn("When making a pass, Team Bond Power +1.1%");
    expect(effects[0]?.stat).toBe("bondGain");
    expect(effects[0]?.conditions).toContain("onTeamPass");
  });

  test("charge-rank loops become conditional per-rank effects", () => {
    const effects = parsePassiveEffectsFromEn(
      "For each Charge Rank up with Rough Play Team Build, Team Rough Attack AT & DF +2%",
    );
    expect(effects[0]?.stat).toBe("roughAttack");
    expect(effects[0]?.scope).toBe("team");
    expect(effects[0]?.conditions).toContain("perBuildChargeRank");
    expect(effects[0]?.direction).toBe("increase");
  });

  test("castle wall pierce on charge rank", () => {
    const effects = parsePassiveEffectsFromEn(
      "For each Charge Rank with Breach Team Build, Team Castle Wall Pierce Rate +1%",
    );
    expect(effects[0]?.stat).toBe("wallPierce");
    expect(effects[0]?.conditions).toContain("perBuildChargeRank");
  });

  test("special move cooldown", () => {
    const effects = parsePassiveEffectsFromEn("Own Special Move Cooldown -0.8%");
    expect(effects[0]?.stat).toBe("tacticCooldown");
    expect(effects[0]?.scope).toBe("self");
    expect(effects[0]?.direction).toBe("decrease");
  });

  test("subbed-in personal AT", () => {
    const effects = parsePassiveEffectsFromEn("Upon being subbed in, AT +8% for 15 sec");
    expect(effects[0]?.scope).toBe("subbedOnPlayer");
    expect(effects[0]?.stat).toBe("AT");
  });

  test("save rate is a team gauge (including charge-rank)", () => {
    const effects = parsePassiveEffectsFromEn(
      "For each Charge Rank up with Breach Team Build, Team Save Rate +4%",
    );
    expect(effects[0]?.stat).toBe("saveRate");
    expect(effects[0]?.scope).toBe("team");
    expect(effects[0]?.conditions).toContain("perBuildChargeRank");
  });

  test("empty / unmapped", () => {
    expect(parsePassiveEffectsFromEn("")).toEqual([]);
    expect(parsePassiveEffectsFromEn("Kick +7")).toEqual([]);
  });
});
