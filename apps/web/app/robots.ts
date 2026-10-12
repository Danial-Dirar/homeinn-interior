import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    // The panel lives at /admins (and /admin redirects there). The locale
    // entries predate that decision; they cost nothing and cover anything that
    // was crawled before. Admin pages are also marked noindex themselves.
    rules: [{
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admins", "/admin", "/en/admin", "/bn/admin"],
    }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
