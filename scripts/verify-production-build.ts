import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

import {
  PUBLIC_ROUTE_PATHS,
  siteUrlForPath,
  siteUrlFromEnvironment,
  SOCIAL_IMAGE_PATH,
} from "@/lib/site";

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`production build: ${message}`);
}

function routeFile(outputDirectory: string, pathname: string): string {
  return pathname === "/"
    ? join(outputDirectory, "index.html")
    : join(outputDirectory, pathname.slice(1), "index.html");
}

export function jpegDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  const frameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
  ]);

  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    if (marker === undefined || marker === 0xd9 || marker === 0xda) break;
    if (marker === 0xff || marker === 0x00) {
      offset += 1;
      continue;
    }
    const length = ((bytes[offset + 2] ?? 0) << 8) | (bytes[offset + 3] ?? 0);
    if (length < 2) return null;
    if (frameMarkers.has(marker)) {
      return {
        height: ((bytes[offset + 5] ?? 0) << 8) | (bytes[offset + 6] ?? 0),
        width: ((bytes[offset + 7] ?? 0) << 8) | (bytes[offset + 8] ?? 0),
      };
    }
    offset += length + 2;
  }
  return null;
}

async function verifyProductionBuild() {
  const siteUrl = siteUrlFromEnvironment(Bun.env);
  invariant(
    siteUrl,
    "SITE_URL or VERCEL_PROJECT_PRODUCTION_URL is required and must resolve to HTTP(S)",
  );
  invariant(
    new URL(siteUrl).pathname === "/",
    "Vercel deployments must use a root domain, not a URL sub-path",
  );

  const outputDirectory = Bun.env.PRERENDER_DIST ?? join(process.cwd(), "dist");
  const expectedUrls = PUBLIC_ROUTE_PATHS.map((pathname) => siteUrlForPath(siteUrl, pathname));
  const socialUrl = siteUrlForPath(siteUrl, SOCIAL_IMAGE_PATH);

  const sitemap = await readFile(join(outputDirectory, "sitemap.xml"), "utf8");
  const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  invariant(
    JSON.stringify(sitemapUrls) === JSON.stringify(expectedUrls),
    "sitemap routes differ from the public route contract",
  );

  const robots = await readFile(join(outputDirectory, "robots.txt"), "utf8");
  invariant(
    robots.includes(`Sitemap: ${siteUrlForPath(siteUrl, "/sitemap.xml")}`),
    "robots.txt does not advertise the sitemap",
  );

  for (const [index, pathname] of PUBLIC_ROUTE_PATHS.entries()) {
    const html = await readFile(routeFile(outputDirectory, pathname), "utf8");
    const canonical = expectedUrls[index];
    invariant(
      canonical && html.includes(`rel="canonical" href="${canonical}"`),
      `${pathname} has the wrong canonical URL`,
    );
    invariant(
      html.includes(`property="og:url" content="${canonical}"`),
      `${pathname} has the wrong Open Graph URL`,
    );
    invariant(
      html.includes(`property="og:image" content="${socialUrl}"`),
      `${pathname} has the wrong social image`,
    );
    invariant(
      html.includes('name="twitter:card" content="summary_large_image"'),
      `${pathname} has no large Twitter Card`,
    );
    invariant(
      html.includes('class="prerender-fallback"'),
      `${pathname} has no static fallback content`,
    );
    invariant(html.includes("<h1"), `${pathname} has no static h1`);
    invariant(!html.includes("kizuna.invalid"), `${pathname} leaked the source canonical sentinel`);
  }

  const vercelConfig = JSON.parse(await readFile(join(process.cwd(), "vercel.json"), "utf8")) as {
    framework?: string;
    buildCommand?: string;
    outputDirectory?: string;
    rewrites?: Array<{ source?: string; destination?: string }>;
    headers?: Array<{ source?: string; headers?: Array<{ key?: string; value?: string }> }>;
  };
  invariant(vercelConfig.framework === "vite", "vercel.json must select the Vite framework");
  invariant(
    vercelConfig.buildCommand === "bun run build:vercel",
    "Vercel must run the strict build command",
  );
  invariant(vercelConfig.outputDirectory === "dist", "Vercel must publish dist/");
  invariant(
    vercelConfig.rewrites?.some(
      (rewrite) => rewrite.source === "/(.*)" && rewrite.destination === "/index.html",
    ),
    "Vercel SPA fallback rewrite is missing",
  );
  const configuredHeaders = vercelConfig.headers?.flatMap((rule) => rule.headers ?? []) ?? [];
  invariant(
    configuredHeaders.some((header) => header.key === "Content-Security-Policy"),
    "Vercel Content-Security-Policy is missing",
  );
  invariant(
    configuredHeaders.some(
      (header) => header.key === "Cache-Control" && header.value?.includes("immutable"),
    ),
    "Vercel immutable asset caching is missing",
  );

  const imagePath = join(outputDirectory, SOCIAL_IMAGE_PATH);
  const image = new Uint8Array(await readFile(imagePath));
  const dimensions = jpegDimensions(image);
  invariant(
    dimensions?.width === 1200 && dimensions.height === 630,
    "social image must be a 1200×630 JPEG",
  );
  invariant((await stat(imagePath)).size <= 300 * 1024, "social image exceeds 300 KiB");

  console.log(`Vercel artifact: PASS · ${PUBLIC_ROUTE_PATHS.length} routes · ${siteUrl}`);
}

if (import.meta.main) await verifyProductionBuild();
