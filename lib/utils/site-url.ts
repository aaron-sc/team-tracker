// Canonical public URL for metadata, robots.txt, sitemap.xml, and JSON-LD — contexts that need a
// plain constant rather than the request-derived getBaseUrl(). Prefers the same env vars every
// other background/static context in this app already reads (see lib/utils/base-url.ts), with a
// hardcoded fallback so local builds and previews still produce valid (if wrong) URLs instead of
// crashing.
export const SITE_URL = (process.env.APP_URL || (process.env.DOMAIN ? `https://${process.env.DOMAIN}` : null) || "https://formation.esports-tools.com").replace(/\/$/, "");
