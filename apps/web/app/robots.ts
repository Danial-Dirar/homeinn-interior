import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    // /admin does not exist until Plan 1C. Disallowing it now means the CMS is
    // never indexed, even in the window between its first deploy and someone
    // remembering to update this file.
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/en/admin", "/bn/admin"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
