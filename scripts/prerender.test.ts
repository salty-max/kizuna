import { describe, expect, test } from "bun:test";

import { renderRouteHtml } from "./prerender";

const template = `<!doctype html><html><head>
  <meta name="description" content="old" />
  <meta property="og:title" content="old" />
  <meta property="og:image" content="/old.jpg" />
  <link rel="canonical" href="/" />
  <title>Old</title>
</head><body><div id="root"></div></body></html>`;

describe("static route rendering", () => {
  test("writes route metadata, absolute social URLs and meaningful fallback content", () => {
    const html = renderRouteHtml(
      template,
      "/wiki/equipment",
      { title: "Équipement — Kizuna", description: "Catalogue complet." },
      "https://example.com/kizuna",
    );

    expect(html).toContain("<title>Équipement — Kizuna</title>");
    expect(html).toContain('href="https://example.com/kizuna/wiki/equipment"');
    expect(html).toContain('content="https://example.com/kizuna/social/kizuna-og.jpg"');
    expect(html).toContain("<h1");
    expect(html).toContain("Catalogue complet.");
  });

  test("keeps safe relative URLs when the production origin is not configured", () => {
    const html = renderRouteHtml(
      template,
      "/wiki",
      { title: "Wiki — Kizuna", description: "Catalogues." },
      null,
    );

    expect(html).toContain('rel="canonical" href="/wiki"');
    expect(html).toContain('content="/social/kizuna-og.jpg"');
  });
});
