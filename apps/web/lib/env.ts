type Env = Record<string, string | undefined>;

const strip = (url: string): string => url.replace(/\/+$/, "");

/**
 * Where the NestJS API lives. `NEXT_PUBLIC_` because the lead form posts from
 * the browser — `POST /api/leads` is throttled per IP, and proxying it through
 * the Next server would put every visitor behind one shared budget.
 */
export function apiBaseUrl(env?: Env): string {
  // Spelled out in full: Next writes a public variable into the browser bundle
  // only where the literal `process.env.NEXT_PUBLIC_…` appears. Read through a
  // variable, the browser saw an empty object and fell back to localhost.
  const value = env ? env.NEXT_PUBLIC_API_URL : process.env.NEXT_PUBLIC_API_URL;
  return strip(value ?? "http://localhost:4000/api");
}

/** The site's own origin. Canonical URLs, hreflang, sitemap and OG tags need it. */
export function siteUrl(env?: Env): string {
  const value = env ? env.NEXT_PUBLIC_SITE_URL : process.env.NEXT_PUBLIC_SITE_URL;
  return strip(value ?? "http://localhost:3000");
}
