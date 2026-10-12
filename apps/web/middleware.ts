import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Everything except Next internals, files with an extension, and the admin
  // panel, which is English-only and lives outside the locale tree.
  matcher: ["/((?!api|admins?/|admins?$|_next|_vercel|.*\\..*).*)"],
};
