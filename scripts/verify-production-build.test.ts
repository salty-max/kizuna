import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

import { jpegDimensions } from "./verify-production-build";

describe("production build verification", () => {
  test("reads the real social card dimensions without a platform image utility", async () => {
    const image = new Uint8Array(await readFile("public/social/kizuna-og.jpg"));
    expect(jpegDimensions(image)).toEqual({ width: 1200, height: 630 });
  });

  test("rejects a payload that is not a JPEG", () => {
    expect(jpegDimensions(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
  });
});
