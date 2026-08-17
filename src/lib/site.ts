export const SITE_NAME = "Kizuna";
export const SOCIAL_IMAGE_PATH = "social/kizuna-og.jpg";

export const PUBLIC_ROUTE_PATHS = [
  "/",
  "/wiki",
  "/wiki/players",
  "/wiki/abilities",
  "/wiki/equipment",
  "/wiki/tactics",
  "/wiki/passives",
  "/wiki/bonds",
  "/wiki/locations",
] as const;

/** Accept only deployable HTTP origins and preserve an optional application sub-path. */
export function normalizeSiteUrl(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;

  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.search = "";
    url.hash = "";
    url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

/** Prefer an explicit domain, otherwise use Vercel's stable production domain. */
export function siteUrlFromEnvironment(
  environment: Record<string, string | undefined>,
): string | null {
  if (environment.SITE_URL) return normalizeSiteUrl(environment.SITE_URL);
  const vercelDomain = environment.VERCEL_PROJECT_PRODUCTION_URL;
  return normalizeSiteUrl(vercelDomain ? `https://${vercelDomain}` : null);
}

/** Join a route or asset to a configured site URL, including a possible base path. */
export function siteUrlForPath(siteUrl: string, pathname: string): string {
  const base = `${normalizeSiteUrl(siteUrl) ?? siteUrl.replace(/\/+$/, "")}/`;
  return new URL(pathname.replace(/^\/+/, ""), base).toString().replace(/\/$/, "");
}
