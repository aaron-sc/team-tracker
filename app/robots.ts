import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/utils/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Everything past these is behind a login anyway — keeping crawlers out avoids indexing
      // login-walled pages and wasting crawl budget on them.
      disallow: ["/account", "/orgs", "/invite/", "/join/", "/reset-password/", "/verify-email", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
