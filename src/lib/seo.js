import { useEffect } from "react";

// ---------------------------------------------------------------------------
// Lightweight per-route SEO manager (no react-helmet dependency).
//
// index.html ships a full static head (crawlers and link unfurlers that don't
// run JS see that). This hook overrides the relevant tags per route once the
// SPA hydrates, keeping title / description / canonical / Open Graph /
// robots / JSON-LD accurate as the user navigates.
// ---------------------------------------------------------------------------

export const SITE_URL = (
  import.meta.env.VITE_SITE_URL || "https://www.clinika.health"
).replace(/\/$/, "");

export const SITE_NAME = "Clinika";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/logo-bg.png`;

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (content == null) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function setJsonLd(id, data) {
  const elId = `jsonld-${id}`;
  let el = document.getElementById(elId);
  if (!data) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = elId;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/**
 * useSeo({
 *   title:        full document title ("Clinika" suffix NOT added automatically)
 *   description:  meta + og + twitter description
 *   path:         canonical path ("/", "/find", "/c/slug"); defaults to current
 *   image:        absolute og image URL (defaults to brand image)
 *   type:         og:type (default "website")
 *   noindex:      true for private/utility pages
 *   jsonLd:       { id: schemaObject } — structured data scoped to this page
 * })
 */
export function useSeo({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE,
  type = "website",
  noindex = false,
  jsonLd = null,
} = {}) {
  useEffect(() => {
    const url = `${SITE_URL}${path ?? window.location.pathname}`;

    if (title) {
      document.title = title;
      setMeta("property", "og:title", title);
      setMeta("name", "twitter:title", title);
    }
    if (description) {
      setMeta("name", "description", description);
      setMeta("property", "og:description", description);
      setMeta("name", "twitter:description", description);
    }

    setCanonical(url);
    setMeta("property", "og:url", url);
    setMeta("property", "og:type", type);
    setMeta("property", "og:image", image);
    setMeta("name", "twitter:image", image);
    setMeta(
      "name",
      "robots",
      noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large"
    );

    const ids = jsonLd ? Object.keys(jsonLd) : [];
    ids.forEach((id) => setJsonLd(id, jsonLd[id]));
    return () => ids.forEach((id) => setJsonLd(id, null));
    // Pages pass fresh object literals each render; stringify for stability.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, path, image, type, noindex, JSON.stringify(jsonLd)]);
}
