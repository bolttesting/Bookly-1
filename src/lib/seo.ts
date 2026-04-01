import { SITE_ORIGIN } from "@/lib/site";

export const DEFAULT_SEO_TITLE =
  "Bookly — Online Appointment Booking Software for Salons, Clinics & Service Businesses";

export const DEFAULT_SEO_DESCRIPTION =
  "Run your entire booking business in one place: online scheduling, client management, staff, reminders, payments, and a branded booking page. Start free with Bookly.";

export type SeoOptions = {
  /** Page title (short); "| Bookly" is appended when the title does not already include Bookly */
  title: string;
  description: string;
  /** Path for canonical & og:url, e.g. "/privacy" */
  path: string;
  noindex?: boolean;
  ogType?: "website" | "article";
  /** Absolute image URL for Open Graph / Twitter */
  ogImage?: string;
};

function ensureMeta(attr: "name" | "property", key: string, content: string) {
  const selector = attr === "property" ? `meta[property="${key}"]` : `meta[name="${key}"]`;
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function ensureLinkRel(rel: string, href: string) {
  let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Updates document head for SPA routes. Call from useEffect (client only).
 */
export function applySeo(options: SeoOptions) {
  const hasBrand = /bookly/i.test(options.title);
  const fullTitle = hasBrand ? options.title : `${options.title} | Bookly`;
  document.title = fullTitle;

  const path = options.path.startsWith("/") ? options.path : `/${options.path}`;
  const url = `${SITE_ORIGIN}${path}`;

  ensureMeta("name", "description", options.description);
  ensureMeta(
    "name",
    "robots",
    options.noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
  );

  ensureMeta("property", "og:title", fullTitle);
  ensureMeta("property", "og:description", options.description);
  ensureMeta("property", "og:url", url);
  ensureMeta("property", "og:type", options.ogType ?? "website");
  ensureMeta("property", "og:site_name", "Bookly");
  ensureMeta("property", "og:locale", "en_US");

  if (options.ogImage) {
    ensureMeta("property", "og:image", options.ogImage);
    ensureMeta("name", "twitter:image", options.ogImage);
  }

  ensureMeta("name", "twitter:card", options.ogImage ? "summary_large_image" : "summary");
  ensureMeta("name", "twitter:title", fullTitle);
  ensureMeta("name", "twitter:description", options.description);

  ensureLinkRel("canonical", url);
}

export function injectJsonLd(id: string, data: Record<string, unknown> | Record<string, unknown>[]) {
  const existing = document.getElementById(id);
  existing?.remove();
  const script = document.createElement("script");
  script.id = id;
  script.type = "application/ld+json";
  script.setAttribute("data-bookly-seo", "1");
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

export function removeJsonLd(id: string) {
  document.getElementById(id)?.remove();
}

export function buildLandingJsonLd() {
  const org = {
    "@type": "Organization",
    "@id": `${SITE_ORIGIN}/#organization`,
    name: "Bookly",
    url: SITE_ORIGIN,
    logo: `${SITE_ORIGIN}/favicon.svg`,
    description: DEFAULT_SEO_DESCRIPTION,
    sameAs: [] as string[],
  };

  const website = {
    "@type": "WebSite",
    "@id": `${SITE_ORIGIN}/#website`,
    url: SITE_ORIGIN,
    name: "Bookly",
    description: DEFAULT_SEO_DESCRIPTION,
    publisher: { "@id": `${SITE_ORIGIN}/#organization` },
    inLanguage: "en-US",
  };

  const software = {
    "@type": "SoftwareApplication",
    name: "Bookly",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description: DEFAULT_SEO_DESCRIPTION,
    url: SITE_ORIGIN,
  };

  return {
    "@context": "https://schema.org",
    "@graph": [org, website, software],
  };
}
