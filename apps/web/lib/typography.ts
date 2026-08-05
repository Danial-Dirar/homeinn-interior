import type { Locale } from "@homeinn/types";

/**
 * Which body font stack a locale renders in. Applied on `<body>` from the
 * server so a Bangla page never flashes the Latin fallback (spec §9).
 */
export function fontClassFor(locale: Locale): string {
  return locale === "bn" ? "font-bangla" : "font-sans";
}
