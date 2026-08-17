import { describe, expect, test } from "bun:test";

import { findFormation } from "@/domain/formations";
import { createTeam, type Team } from "@/domain/team";
import { decodeShareInput, decodeTeam, encodeShareCode, encodeTeam } from "./share";

function filledTeam(): Team {
  const team = createTeam("4-3-3-triangle");
  team.name = "Raimon — smoke screen";

  const formation = findFormation("4-3-3-triangle");
  formation.slots.forEach((slot, index) => {
    team.slots[slot.id]!.playerId = index + 1;
  });

  const gk = team.slots.gk!;
  gk.equipment.boots = "eq_sh071101";
  gk.equipment.misc = "eq_sp0108101";
  gk.passives[0] = { passiveId: "ps10001", value: 1.5 };
  gk.passives[5] = { passiveId: "ps10044_01", value: -2 };

  team.slots.bench1!.playerId = 99;
  team.slots.coach!.passives[0] = { passiveId: "cps10001", value: 12 };
  team.slots.manager2!.passives[1] = { passiveId: "mps10003_01", value: 3.8 };

  return team;
}

describe("team sharing", () => {
  test("round-trips a fully configured team", () => {
    const team = filledTeam();
    expect(decodeTeam(encodeTeam(team))).toEqual(team);
  });

  test("round-trips an empty team", () => {
    const team = createTeam();
    expect(decodeTeam(encodeTeam(team))).toEqual(team);
  });

  test("keeps a filled squad short enough to paste anywhere", () => {
    expect(encodeTeam(filledTeam()).length).toBeLessThan(800);
  });

  test("survives a name with the format's own separators", () => {
    const team = createTeam();
    team.name = "a~b|c,d*e #1";
    expect(decodeTeam(encodeTeam(team))!.name).toBe(team.name);
  });

  test("rejects a payload from a different version", () => {
    const encoded = encodeTeam(createTeam());
    expect(decodeTeam(`9${encoded.slice(1)}`)).toBeNull();
  });

  test("rejects an unknown formation instead of silently reshaping the squad", () => {
    expect(decodeTeam("4~4-4-2-carre~Test~")).toBeNull();
  });

  test("rejects a v1 link, whose slot fields predate rarity", () => {
    expect(decodeTeam("1~4-4-2-diamond~Test~1,B76")).toBeNull();
  });

  test("rejects a v2 link, whose player/equipment ids predate the dataminer", () => {
    expect(decodeTeam("2~4-4-2-diamond~Test~1,5,B76")).toBeNull();
  });

  test("rejects a v3 link, whose passive ids predate the dataminer catalogue", () => {
    expect(decodeTeam("3~4-4-2-diamond~Test~1,,,,p001*1.5")).toBeNull();
  });

  test("rejects a v4 link, which had no tactics field", () => {
    expect(decodeTeam("4~4-4-2-diamond~Test~1")).toBeNull();
  });

  test("rejects a v5 link, which had no ruleset field", () => {
    expect(decodeTeam("5~4-4-2-diamond~Test~~1")).toBeNull();
  });

  test("rejects a v6 link, which had no synergy attachments", () => {
    expect(decodeTeam("6~4-4-2-diamond~Test~standard~~1")).toBeNull();
  });

  test("rejects a v7 link, which had no Build Rank scenario", () => {
    expect(decodeTeam("7~4-4-2-diamond~Test~standard~~~~1")).toBeNull();
  });

  test("round-trips prepared tactics", () => {
    const team = createTeam();
    team.tacticIds = ["wht10080", "wht20010"];
    expect(decodeTeam(encodeTeam(team))).toEqual(team);
  });

  test("round-trips the tournament ruleset", () => {
    const team = createTeam();
    team.rulesetId = "tournament";
    expect(decodeTeam(encodeTeam(team))).toEqual(team);
  });

  test("round-trips offensive and defensive synergy attachments", () => {
    const team = createTeam();
    team.offensiveSynergyId = "sf01000010";
    team.defensiveSynergyId = "sp05001";
    expect(decodeTeam(encodeTeam(team))).toEqual(team);
  });

  test("round-trips a Build Rank scenario", () => {
    const team = createTeam();
    team.teamBuildType = "justice";
    team.buildRank = 4;
    expect(decodeTeam(encodeTeam(team))).toEqual(team);
  });

  test("rejects malformed input", () => {
    expect(decodeTeam("")).toBeNull();
    expect(decodeTeam("garbage")).toBeNull();
    expect(decodeTeam("8~4-4-2-diamond")).toBeNull();
  });

  test("tolerates a truncated slot list", () => {
    const team = createTeam("4-4-2-diamond");
    team.slots.gk!.playerId = 1;

    // v8: formation~name~ruleset~tactics~offensive~defensive~build~rank~slots
    const decoded = decodeTeam("8~4-4-2-diamond~Test~standard~~~~~0~1")!;

    expect(decoded.slots.gk!.playerId).toBe(1);
    expect(decoded.slots.df1!.playerId).toBeNull();
    expect(Object.keys(decoded.slots)).toEqual(Object.keys(team.slots));
  });

  test("round-trips an archetype override", () => {
    const team = createTeam();
    team.slots.gk!.playerId = 1;
    team.slots.gk!.buildType = "roughPlay";
    team.slots.df1!.playerId = 2;

    const decoded = decodeTeam(encodeTeam(team))!;

    expect(decoded.slots.gk!.buildType).toBe("roughPlay");
    expect(decoded.slots.df1!.buildType).toBeNull();
  });

  test("round-trips the first archetype, which a 0-based encoding would lose", () => {
    const team = createTeam();
    team.slots.gk!.playerId = 1;
    team.slots.gk!.buildType = "breach";

    expect(decodeTeam(encodeTeam(team))!.slots.gk!.buildType).toBe("breach");
  });

  test("keeps a link produced without the archetype field readable", () => {
    const decoded = decodeTeam(
      "8~4-4-2-diamond~Test~standard~~~~~0~1,4,eq_sh071101,,,,ps10001*1.5",
    )!;

    expect(decoded.slots.gk!.playerId).toBe(1);
    expect(decoded.slots.gk!.rarity).toBe("legendary");
    expect(decoded.slots.gk!.equipment.boots).toBe("eq_sh071101");
    expect(decoded.slots.gk!.passives[0]).toEqual({ passiveId: "ps10001", value: 1.5 });
    expect(decoded.slots.gk!.buildType).toBeNull();
  });

  test("round-trips a non-default rarity", () => {
    const team = createTeam();
    team.slots.gk!.playerId = 1;
    team.slots.gk!.rarity = "legendary";
    team.slots.df1!.playerId = 2;

    const decoded = decodeTeam(encodeTeam(team))!;

    expect(decoded.slots.gk!.rarity).toBe("legendary");
    expect(decoded.slots.df1!.rarity).toBe("common");
  });

  test("costs nothing in the URL when every slot is Normal", () => {
    const team = createTeam();
    team.slots.gk!.playerId = 1;

    // Empty name, tactics, attachments and build remain explicit around the ruleset.
    expect(encodeTeam(team)).toBe("8~4-4-2-diamond~~standard~~~~~0~1");
  });

  test("keeps rarity and equipment on separate fields", () => {
    const team = createTeam();
    team.slots.gk!.playerId = 7;
    team.slots.gk!.rarity = "hero";
    team.slots.gk!.equipment.boots = "eq_sh071101";

    const decoded = decodeTeam(encodeTeam(team))!;

    expect(decoded.slots.gk!.rarity).toBe("hero");
    expect(decoded.slots.gk!.equipment.boots).toBe("eq_sh071101");
  });

  test("preserves fractional and negative passive values", () => {
    const team = createTeam();
    team.slots.gk!.passives[0] = { passiveId: "ps10012", value: -3.75 };

    expect(decodeTeam(encodeTeam(team))!.slots.gk!.passives[0]).toEqual({
      passiveId: "ps10012",
      value: -3.75,
    });
  });
});

describe("share codes", () => {
  test("round-trips a full team through KZ1 compression", () => {
    const team = filledTeam();
    const code = encodeShareCode(team);
    expect(code.startsWith("KZ1.")).toBe(true);
    expect(decodeShareInput(code)).toEqual(team);
  });

  test("is shorter than the raw payload on a filled squad", () => {
    const team = filledTeam();
    expect(encodeShareCode(team).length).toBeLessThan(encodeTeam(team).length);
  });

  test("tolerates whitespace and newlines in a pasted code", () => {
    const team = filledTeam();
    const code = encodeShareCode(team);
    const wrapped = code.slice(0, 40) + "\n" + code.slice(40, 80) + " " + code.slice(80);
    expect(decodeShareInput(wrapped)).toEqual(team);
  });

  test("loads a team from a full URL with #c=", () => {
    const team = filledTeam();
    const url = `https://example.com/kizuna/#c=${encodeShareCode(team)}`;
    expect(decodeShareInput(url)).toEqual(team);
  });

  test("still loads a legacy #t= raw payload URL", () => {
    const team = createTeam();
    team.slots.gk!.playerId = 1;
    const url = `https://example.com/#t=${encodeTeam(team)}`;
    expect(decodeShareInput(url)?.slots.gk!.playerId).toBe(1);
  });

  test("accepts a bare raw payload as a paste fallback", () => {
    const team = createTeam();
    team.name = "Paste raw";
    expect(decodeShareInput(encodeTeam(team))).toEqual(team);
  });

  test("rejects garbage", () => {
    expect(decodeShareInput("")).toBeNull();
    expect(decodeShareInput("KZ1.not-valid!!!")).toBeNull();
    expect(decodeShareInput("hello world")).toBeNull();
  });
});
