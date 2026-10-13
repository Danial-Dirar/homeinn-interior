import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "bn"],
  defaultLocale: "en",
  // Spec §9: locale is a route segment on every page, including the default,
  // so each language is independently indexable and has a stable canonical URL.
  localePrefix: "always",
  localeDetection: true,
  // Every page declares its hreflang alternates in <head> from the public
  // site URL. next-intl's Link header would repeat them, built from the
  // proxied request (http, not https).
  alternateLinks: false,
});
