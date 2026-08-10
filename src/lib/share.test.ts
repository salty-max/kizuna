import { describe, expect, test } from "bun:test";

import { findFormation } from "@/domain/formations";
import { createTeam, type Team } from "@/domain/team";
import { decodeTeam, encodeTeam } from "./share";

function filledTeam(): Team {
  const team = createTeam("4-3-3-triangle");
  team.name = "Raimon — écran de fumée";

  const formation = findFormation("4-3-3-triangle");
  formation.slots.forEach((slot, index) => {
    team.slots[slot.id]!.playerId = index + 1;
  });

  const gk = team.slots.gk!;
  gk.equipment.boots = "boots:B1";
  gk.equipment.misc = "misc:M12";
  gk.passives[0] = { passiveId: "passive_001", value: 1.5 };
  gk.passives[5] = { passiveId: "custom_037", value: -2 };

  team.slots.bench1!.playerId = 99;
  team.slots.manager!.passives[0] = { passiveId: "manager_042", value: 12 };
  team.slots.coord2!.passives[1] = { passiveId: "coordinator_007", value: 3.8 };

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
    expect(encodeTeam(filledTeam()).length).toBeLessThan(600);
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
    expect(decodeTeam("2~4-4-2-carre~Test~")).toBeNull();
  });

  test("rejects a v1 link, whose slot fields predate rarity", () => {
    // v1 had no rarity field, so its equipment ids sit one position earlier.
    // Decoding it under v2 rules would silently mis-assign every item.
    expect(decodeTeam("1~4-4-2-diamond~Test~1,B76")).toBeNull();
  });

  test("rejects malformed input", () => {
    expect(decodeTeam("")).toBeNull();
    expect(decodeTeam("garbage")).toBeNull();
    expect(decodeTeam("2~4-4-2-diamond")).toBeNull();
  });

  test("tolerates a truncated slot list", () => {
    const team = createTeam("4-4-2-diamond");
    team.slots.gk!.playerId = 1;

    const decoded = decodeTeam("2~4-4-2-diamond~Test~1")!;

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
    team.slots.gk!.buildType = "breach"; // index 0 in BUILD_TYPES

    expect(decodeTeam(encodeTeam(team))!.slots.gk!.buildType).toBe("breach");
  });

  test("keeps a link produced before the archetype field readable", () => {
    // The field was appended rather than inserted, so older payloads still
    // decode — that is why this needed no version bump.
    const decoded = decodeTeam("2~4-4-2-diamond~Test~1,4,B76,,,,p001*1.5")!;

    expect(decoded.slots.gk!.playerId).toBe(1);
    expect(decoded.slots.gk!.rarity).toBe("legendary");
    expect(decoded.slots.gk!.equipment.boots).toBe("boots:B76");
    expect(decoded.slots.gk!.passives[0]).toEqual({ passiveId: "passive_001", value: 1.5 });
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

    expect(encodeTeam(team)).toBe("2~4-4-2-diamond~Nouvelle%20%C3%A9quipe~1");
  });

  test("keeps rarity and equipment on separate fields", () => {
    const team = createTeam();
    team.slots.gk!.playerId = 7;
    team.slots.gk!.rarity = "hero";
    team.slots.gk!.equipment.boots = "boots:B76";

    const decoded = decodeTeam(encodeTeam(team))!;

    expect(decoded.slots.gk!.rarity).toBe("hero");
    expect(decoded.slots.gk!.equipment.boots).toBe("boots:B76");
  });

  test("preserves fractional and negative passive values", () => {
    const team = createTeam();
    team.slots.gk!.passives[0] = { passiveId: "passive_012", value: -3.75 };

    expect(decodeTeam(encodeTeam(team))!.slots.gk!.passives[0]).toEqual({
      passiveId: "passive_012",
      value: -3.75,
    });
  });
});
