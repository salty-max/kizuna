import { describe, expect, test } from "bun:test";

import {
  encodeInazugleCharacterQuery,
  inazugleModelViewerUrl,
  modelFrameUrl,
  parseModelStemFromHtml,
} from "./inazugleModel";

describe("inazugleModel", () => {
  test("encodes character_id the way Inazugle's viewer expects", () => {
    // XOR 0xFF + base64url of {"character_id":["c01000010"]}
    expect(encodeInazugleCharacterQuery("c01000010")).toBe(
      "hN2cl56NnpyLmo2glpvdxaTdnM_Oz8_Pz87P3aKC",
    );
    expect(encodeInazugleCharacterQuery("c01000100")).toBe(
      "hN2cl56NnpyLmo2glpvdxaTdnM_Oz8_Pzs_P3aKC",
    );
  });

  test("builds official viewer and frame URLs", () => {
    expect(inazugleModelViewerUrl("c01000010", "en")).toContain(
      "zukan.inazuma.jp/en/chara_model_view/?q=hN2cl56NnpyLmo2glpvdxaTdnM_Oz8_Pz87P3aKC",
    );
    expect(modelFrameUrl("https://cdn.example/", "1/k/q/l/qluc-tlklmm", 0, "bust")).toBe(
      "https://cdn.example/1/k/q/l/qluc-tlklmm_r0.webp",
    );
    expect(modelFrameUrl("https://cdn.example", "1/k/q/l/qluc-tlklmm", 3, "full", "png")).toBe(
      "https://cdn.example/1/k/q/l/qluc-tlklmm_r3_fullbody.png",
    );
  });

  test("parses the turntable stem from Inazugle HTML", () => {
    const html = `
      const imageUrls = Array.from({ length: imageCount }, (_, i) => {
        return \`https://dxi4wb638ujep.cloudfront.net/1/k/q/l/qluc-tlklmm\` + \`_r\${i}\${suffix}\`
      });
    `;
    expect(parseModelStemFromHtml(html)).toBe("1/k/q/l/qluc-tlklmm");
    expect(parseModelStemFromHtml("<html></html>")).toBeNull();
  });
});
