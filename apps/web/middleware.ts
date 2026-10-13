import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const handleLocale = createMiddleware(routing);

/**
 * next-intl's locale redirects (`/` → `/en`) are built from `request.url`,
 * which behind the proxy is the server's own loopback address — so a visitor
 * to https://homeinn.xyz/ was sent to https://localhost:3200/en. A redirect
 * within the site is made relative instead: the browser keeps the address it
 * is on, whatever that is, and no forwarded header has to be trusted.
 */
export default function middleware(request: NextRequest) {
  const response = handleLocale(request);
  const location = response.headers.get("location");
  if (location) {
    const target = new URL(location, request.url);
    if (target.origin === request.nextUrl.origin) {
      response.headers.set("location", `${target.pathname}${target.search}${target.hash}`);
    }
  }
  return response;
}

export const config = {
  // Everything except Next internals, files with an extension, and the admin
  // panel, which is English-only and lives outside the locale tree.
  matcher: ["/((?!api|admins?/|admins?$|_next|_vercel|.*\\..*).*)"],
};
