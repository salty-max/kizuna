import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { Dataset } from "@/domain/types";
import { createTranslator } from "@/i18n";
import { metadataForPath } from "@/lib/routeMetadata";
import {
  PUBLIC_ROUTE_PATHS,
  SITE_NAME,
  siteUrlForPath,
  SOCIAL_IMAGE_PATH,
  siteUrlFromEnvironment,
} from "@/lib/site";

interface StaticMetadata {
  title: string;
  description: string;
}

const EMPTY_DATASET: Dataset = {
  players: [],
  passives: [],
  equipment: [],
  abilities: [],
  synergies: [],
  locations: [],
  tactics: [],
  games: [],
  imageBase: "",
  generatedAt: "",
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceOrInsertMeta(
  html: string,
  attribute: "name" | "property",
  key: string,
  content: string,
): string {
  const tag = `<meta ${attribute}="${escapeHtml(key)}" content="${escapeHtml(content)}" />`;
  const pattern = new RegExp(`<meta\\s+[^>]*${attribute}=["']${escapeRegExp(key)}["'][^>]*>`, "i");
  return pattern.test(html)
    ? html.replace(pattern, tag)
    : html.replace("</head>", `    ${tag}\n  </head>`);
}

function replaceOrInsertCanonical(html: string, href: string): string {
  const tag = `<link rel="canonical" href="${escapeHtml(href)}" />`;
  const pattern = /<link\s+[^>]*rel=["']canonical["'][^>]*>/i;
  return pattern.test(html)
    ? html.replace(pattern, tag)
    : html.replace("</head>", `    ${tag}\n  </head>`);
}

function fallbackMarkup(metadata: StaticMetadata, siteUrl: string | null): string {
  const links = PUBLIC_ROUTE_PATHS.filter((path) => path !== "/")
    .map((path) => {
      const href = siteUrl ? siteUrlForPath(siteUrl, path) : path;
      return `<li><a href="${escapeHtml(href)}">${escapeHtml(path.replace("/wiki/", "").replace("/wiki", "Wiki"))}</a></li>`;
    })
    .join("");

  return `<main class="prerender-fallback" style="box-sizing:border-box;min-height:100vh;padding:clamp(2rem,8vw,8rem);background:#0f0b0d;color:#f5eef0;font-family:system-ui,sans-serif">
      <p style="margin:0 0 1rem;color:#ffd43b;font-weight:800;letter-spacing:.14em;text-transform:uppercase">${SITE_NAME}</p>
      <h1 style="max-width:56rem;margin:0;font-size:clamp(2rem,6vw,5rem);line-height:1">${escapeHtml(metadata.title)}</h1>
      <p style="max-width:48rem;margin:1.5rem 0;color:#c9b9bd;font-size:1.125rem;line-height:1.6">${escapeHtml(metadata.description)}</p>
      <nav aria-label="Catalogues"><ul style="display:flex;max-width:56rem;flex-wrap:wrap;gap:.75rem 1.5rem;padding:0;list-style:none">${links}</ul></nav>
    </main>`;
}

/** Build one route-specific HTML document from Vite's client entry point. */
export function renderRouteHtml(
  template: string,
  pathname: string,
  metadata: StaticMetadata,
  siteUrl: string | null,
): string {
  const canonical = siteUrl ? siteUrlForPath(siteUrl, pathname) : pathname;
  const socialImage = siteUrl
    ? siteUrlForPath(siteUrl, SOCIAL_IMAGE_PATH)
    : `/${SOCIAL_IMAGE_PATH}`;
  const imageAlt = `${SITE_NAME} — Inazuma Eleven: Victory Road team builder`;

  let html = template.replace(
    /<title>[^<]*<\/title>/i,
    `<title>${escapeHtml(metadata.title)}</title>`,
  );
  html = replaceOrInsertCanonical(html, canonical);
  html = replaceOrInsertMeta(html, "name", "description", metadata.description);
  html = replaceOrInsertMeta(html, "property", "og:title", metadata.title);
  html = replaceOrInsertMeta(html, "property", "og:description", metadata.description);
  html = replaceOrInsertMeta(html, "property", "og:url", canonical);
  html = replaceOrInsertMeta(html, "property", "og:image", socialImage);
  html = replaceOrInsertMeta(html, "property", "og:image:width", "1200");
  html = replaceOrInsertMeta(html, "property", "og:image:height", "630");
  html = replaceOrInsertMeta(html, "property", "og:image:alt", imageAlt);
  html = replaceOrInsertMeta(html, "name", "twitter:title", metadata.title);
  html = replaceOrInsertMeta(html, "name", "twitter:description", metadata.description);
  html = replaceOrInsertMeta(html, "name", "twitter:image", socialImage);
  html = replaceOrInsertMeta(html, "name", "twitter:image:alt", imageAlt);
  return html.replace(
    '<div id="root"></div>',
    `<div id="root">${fallbackMarkup(metadata, siteUrl)}</div>`,
  );
}

function sitemapXml(siteUrl: string): string {
  const urls = PUBLIC_ROUTE_PATHS.map(
    (pathname) => `  <url><loc>${escapeHtml(siteUrlForPath(siteUrl, pathname))}</loc></url>`,
  ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

async function prerender() {
  const outputDirectory = Bun.env.PRERENDER_DIST ?? join(process.cwd(), "dist");
  const configuredUrl = Bun.env.SITE_URL ?? Bun.env.VERCEL_PROJECT_PRODUCTION_URL;
  const siteUrl = siteUrlFromEnvironment(Bun.env);
  if (configuredUrl && !siteUrl) throw new Error("The deployment URL must be a valid HTTP(S) URL");

  const template = await readFile(join(outputDirectory, "index.html"), "utf8");
  const { t } = createTranslator("fr");

  for (const pathname of PUBLIC_ROUTE_PATHS) {
    const metadata = metadataForPath(pathname, EMPTY_DATASET, t, "fr", false);
    const output =
      pathname === "/"
        ? join(outputDirectory, "index.html")
        : join(outputDirectory, pathname.slice(1), "index.html");
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, renderRouteHtml(template, pathname, metadata, siteUrl));
  }

  const robots = siteUrl
    ? `User-agent: *\nAllow: /\n\nSitemap: ${siteUrlForPath(siteUrl, "/sitemap.xml")}\n`
    : "User-agent: *\nAllow: /\n";
  await writeFile(join(outputDirectory, "robots.txt"), robots);

  if (siteUrl) {
    await writeFile(join(outputDirectory, "sitemap.xml"), sitemapXml(siteUrl));
  } else {
    console.warn(
      "prerender: deployment URL missing — relative canonicals; sitemap.xml not generated",
    );
  }

  console.log(
    `prerender: ${PUBLIC_ROUTE_PATHS.length} routes statiques${siteUrl ? " + sitemap.xml" : ""}`,
  );
}

if (import.meta.main) await prerender();
