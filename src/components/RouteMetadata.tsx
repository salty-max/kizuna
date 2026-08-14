import { useEffect } from "react";
import { useLocation } from "react-router";

import { useDataset } from "@/data/useDataset";
import { useI18n } from "@/i18n";
import { metadataForPath } from "@/lib/routeMetadata";
import { normalizeSiteUrl, SITE_NAME, siteUrlForPath, SOCIAL_IMAGE_PATH } from "@/lib/site";

const OPEN_GRAPH_LOCALE = { fr: "fr_FR", en: "en_US", ja: "ja_JP" } as const;

function setMeta(attribute: "name" | "property", key: string, content: string) {
  let element = document.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.append(element);
  }
  element.content = content;
}

function setCanonical(href: string) {
  let element = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.append(element);
  }
  element.href = href;
}

/** Keep browser and social metadata aligned with the active SPA route. */
export function RouteMetadata() {
  const { pathname } = useLocation();
  const dataset = useDataset();
  const { t, locale, showOriginalNames } = useI18n();

  useEffect(() => {
    const metadata = metadataForPath(pathname, dataset, t, locale, showOriginalNames);
    const runtimeBase = `${window.location.origin}${import.meta.env.BASE_URL}`;
    const siteUrl = normalizeSiteUrl(import.meta.env.VITE_SITE_URL) ?? runtimeBase;
    const canonical = siteUrlForPath(siteUrl, pathname);
    const socialImage = siteUrlForPath(siteUrl, SOCIAL_IMAGE_PATH);
    const imageAlt = `${SITE_NAME} — Inazuma Eleven: Victory Road team builder`;

    document.title = metadata.title;
    setCanonical(canonical);
    setMeta("name", "description", metadata.description);
    setMeta("property", "og:title", metadata.title);
    setMeta("property", "og:description", metadata.description);
    setMeta("property", "og:url", canonical);
    setMeta("property", "og:image", socialImage);
    setMeta("property", "og:image:width", "1200");
    setMeta("property", "og:image:height", "630");
    setMeta("property", "og:image:alt", imageAlt);
    setMeta("property", "og:locale", OPEN_GRAPH_LOCALE[locale]);
    setMeta("name", "twitter:title", metadata.title);
    setMeta("name", "twitter:description", metadata.description);
    setMeta("name", "twitter:image", socialImage);
    setMeta("name", "twitter:image:alt", imageAlt);
  }, [dataset, locale, pathname, showOriginalNames, t]);

  return null;
}

/** One exact, visually hidden page heading for screen-reader and outline navigation. */
export function RouteHeading() {
  const { pathname } = useLocation();
  const dataset = useDataset();
  const { t, locale, showOriginalNames } = useI18n();
  const metadata = metadataForPath(pathname, dataset, t, locale, showOriginalNames);
  return <h1 className="sr-only">{metadata.title}</h1>;
}
