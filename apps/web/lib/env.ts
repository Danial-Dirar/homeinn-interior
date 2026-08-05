type Env = Record<string, string | undefined>;

const strip = (url: string): string => url.replace(/\/+$/, "");

/**
 * Where the NestJS API lives. `NEXT_PUBLIC_` because the lead form posts from
 * the browser — `POST /api/leads` is throttled per IP, and proxying it through
 * the Next server would put every visitor behind one shared budget.
 */
export function apiBaseUrl(env: Env = process.env): string {
  return strip(env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api");
}

/** The site's own origin. Canonical URLs, hreflang, sitemap and OG tags need it. */
export function siteUrl(env: Env = process.env): string {
  return strip(env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
}
