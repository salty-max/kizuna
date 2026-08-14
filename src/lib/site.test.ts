import { describe, expect, test } from "bun:test";

import { normalizeSiteUrl, siteUrlForPath, siteUrlFromEnvironment } from "@/lib/site";

describe("site URL helpers", () => {
  test("normalizes a public origin while preserving its base path", () => {
    expect(normalizeSiteUrl("https://example.com/kizuna/?preview=1#top")).toBe(
      "https://example.com/kizuna",
    );
  });

  test("rejects missing, malformed and non-HTTP deployment URLs", () => {
    expect(normalizeSiteUrl(undefined)).toBeNull();
    expect(normalizeSiteUrl("not a URL")).toBeNull();
    expect(normalizeSiteUrl("ftp://example.com/kizuna")).toBeNull();
  });

  test("joins routes and assets below an optional deployment path", () => {
    expect(siteUrlForPath("https://example.com/kizuna", "/wiki/players")).toBe(
      "https://example.com/kizuna/wiki/players",
    );
    expect(siteUrlForPath("https://example.com", "/")).toBe("https://example.com");
  });

  test("prefers SITE_URL and otherwise resolves Vercel's stable production domain", () => {
    expect(
      siteUrlFromEnvironment({
        SITE_URL: "https://kizuna.example.com",
        VERCEL_PROJECT_PRODUCTION_URL: "kizuna.vercel.app",
      }),
    ).toBe("https://kizuna.example.com");
    expect(siteUrlFromEnvironment({ VERCEL_PROJECT_PRODUCTION_URL: "kizuna.vercel.app" })).toBe(
      "https://kizuna.vercel.app",
    );
    expect(siteUrlFromEnvironment({})).toBeNull();
  });
});
