import { describe, expect, test } from "bun:test";

import { parsePassiveEffectsFromEn } from "./passiveParse";
import type { PassiveEffect } from "./types";

function percentEffect(effects: PassiveEffect[]) {
  const e = effects[0];
  expect(e?.mode).toBe("percent");
  if (e?.mode !== "percent") throw new Error("expected percent effect");
  return e;
}

describe("parsePassiveEffectsFromEn", () => {
  test("team AT first half", () => {
    const effects = parsePassiveEffectsFromEn("Team AT +4% for the first half");
    expect(effects).toEqual([
      {
        mode: "percent",
        scope: "team",
        stat: "AT",
        direction: "increase",
        conditions: ["matchTimeHalfFirst"],
      },
    ]);
  });

  test("direct shot with bond condition", () => {
    const e = percentEffect(
      parsePassiveEffectsFromEn("When at 20% or more Bond Power, Team Direct Shot AT +4.5%"),
    );
    expect(e.stat).toBe("directShotAT");
    expect(e.scope).toBe("team");
    expect(e.conditions).toContain("bondPowerAtLeast20");
  });

  test("same-element scramble", () => {
    const e = percentEffect(
      parsePassiveEffectsFromEn("Scramble AT & DF +1.2% for players of the same element"),
    );
    expect(e.stat).toBe("scramble");
    expect(e.scope).toBe("alliesSameElement");
  });

  test("own half personal scramble", () => {
    const e = percentEffect(parsePassiveEffectsFromEn("Own Scramble AT & DF +12% in own half"));
    expect(e.stat).toBe("scramble");
    expect(e.scope).toBe("self");
    expect(e.conditions).toContain("fieldZoneOwnHalf");
  });

  test("foul rate decrease", () => {
    const e = percentEffect(
      parsePassiveEffectsFromEn("When outside the zone, Team Foul Rate -16%"),
    );
    expect(e.stat).toBe("foulRate");
    expect(e.direction).toBe("decrease");
    expect(e.conditions).toContain("outsideZoneArea");
  });

  test("tactic cooldown self", () => {
    const e = percentEffect(parsePassiveEffectsFromEn("Own Special Tactics Cooldown -8%"));
    expect(e.stat).toBe("tacticCooldown");
    expect(e.scope).toBe("self");
    expect(e.direction).toBe("decrease");
  });

  test("bond power gain on pass", () => {
    const e = percentEffect(parsePassiveEffectsFromEn("When making a pass, Team Bond Power +1.1%"));
    expect(e.stat).toBe("bondGain");
    expect(e.conditions).toContain("onTeamPass");
  });

  test("charge-rank loops become conditional per-rank effects", () => {
    const e = percentEffect(
      parsePassiveEffectsFromEn(
        "For each Charge Rank up with Rough Play Team Build, Team Rough Attack AT & DF +2%",
      ),
    );
    expect(e.stat).toBe("roughAttack");
    expect(e.scope).toBe("team");
    expect(e.conditions).toContain("perBuildChargeRank");
    expect(e.direction).toBe("increase");
  });

  test("charge-rank effects retain their required Team Build", () => {
    expect(
      parsePassiveEffectsFromEn(
        "For each Charge Rank up with Justice Team Build, Team AT & DF +0.8%",
      )[0],
    ).toMatchObject({
      stat: "all",
      conditions: ["perBuildChargeRank"],
      requiredBuildType: "justice",
    });
  });

  test("castle wall pierce on charge rank", () => {
    const e = percentEffect(
      parsePassiveEffectsFromEn(
        "For each Charge Rank with Breach Team Build, Team Castle Wall Pierce Rate +1%",
      ),
    );
    expect(e.stat).toBe("wallPierce");
    expect(e.conditions).toContain("perBuildChargeRank");
  });

  test("special move cooldown", () => {
    const e = percentEffect(parsePassiveEffectsFromEn("Own Special Move Cooldown -0.8%"));
    expect(e.stat).toBe("tacticCooldown");
    expect(e.scope).toBe("self");
    expect(e.direction).toBe("decrease");
  });

  test("subbed-in personal AT", () => {
    const e = percentEffect(parsePassiveEffectsFromEn("Upon being subbed in, AT +8% for 15 sec"));
    expect(e.scope).toBe("subbedOnPlayer");
    expect(e.stat).toBe("AT");
    expect(e.conditions).toContain("afterSubstitution");
  });

  test("possession recovery window", () => {
    const e = percentEffect(
      parsePassiveEffectsFromEn(
        "On gaining possession (excluding catches), Team Shot AT +8% for 30 sec",
      ),
    );
    expect(e.stat).toBe("shotAT");
    expect(e.conditions).toContain("afterBallRecoveryNoDirectCatch");
  });

  test("dash knockback", () => {
    const e = percentEffect(parsePassiveEffectsFromEn("On Dash knockback, Team Bond Power +15%"));
    expect(e.stat).toBe("bondGain");
    expect(e.conditions).toContain("onMarkedOrBlockedWhileDashing");
  });

  test("until first foul", () => {
    const e = percentEffect(
      parsePassiveEffectsFromEn("Until you incur a foul, Team Castle Wall DF +5%"),
    );
    expect(e.stat).toBe("wallDF");
    expect(e.conditions).toContain("noFoulCommittedYet");
  });

  test("save rate is a team gauge (including charge-rank)", () => {
    const e = percentEffect(
      parsePassiveEffectsFromEn(
        "For each Charge Rank up with Breach Team Build, Team Save Rate +4%",
      ),
    );
    expect(e.stat).toBe("saveRate");
    expect(e.scope).toBe("team");
    expect(e.conditions).toContain("perBuildChargeRank");
  });

  test("flat base stat Kick +7", () => {
    const effects = parsePassiveEffectsFromEn("Kick +7");
    expect(effects).toEqual([
      {
        mode: "flat",
        scope: "self",
        baseStat: "kick",
        direction: "increase",
        conditions: [],
      },
    ]);
  });

  test("empty / unmapped", () => {
    expect(parsePassiveEffectsFromEn("")).toEqual([]);
    expect(parsePassiveEffectsFromEn("ps0001")).toEqual([]);
  });
});
