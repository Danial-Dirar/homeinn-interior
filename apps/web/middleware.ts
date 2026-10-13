import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const handleLocale = createMiddleware(routing);

/** A bare host name with an optional port; nothing that could bend a URL. */
const HOST = /^[a-z0-9.-]+(:\d{1,5})?$/i;

/**
 * Where the visitor actually is: the host and scheme the proxy forwards
 * (Caddy sends X-Forwarded-Host and X-Forwarded-Proto, and only for the host
 * names it serves). Null when nothing usable was forwarded.
 */
function publicOrigin(request: NextRequest): string | null {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  if (!HOST.test(host)) return null;
  const proto = request.headers.get("x-forwarded-proto") === "https" ? "https" : request.nextUrl.protocol.replace(":", "");
  return `${proto}://${host}`;
}

/**
 * next-intl builds its locale redirects (`/` → `/en`) from `request.url`,
 * which behind the proxy is the server's own loopback address, and Next then
 * rebuilds any same-origin redirect on that address — so visitors to
 * https://homeinn.xyz/ were sent to https://localhost:3200/en. The redirect
 * is rebuilt here on the visitor's own address. It stays absolute, because
 * Next requires a middleware redirect to be one.
 */
export default function middleware(request: NextRequest) {
  const response = handleLocale(request);
  const location = response.headers.get("location");
  const origin = publicOrigin(request);
  if (location && origin) {
    const target = new URL(location, request.url);
    if (target.origin === request.nextUrl.origin) {
      response.headers.set("location", `${origin}${target.pathname}${target.search}${target.hash}`);
    }
  }
  return response;
}

export const config = {
  // Everything except Next internals, files with an extension, and the admin
  // panel, which is English-only and lives outside the locale tree.
  matcher: ["/((?!api|admins?/|admins?$|_next|_vercel|.*\\..*).*)"],
};
