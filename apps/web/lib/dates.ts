import type { Locale } from "@homeinn/types";

const FORMATS: Record<Locale, string> = { en: "en-GB", bn: "bn-BD" };

/**
 * A published date, in the reader's locale. Returns an empty string rather than
 * "Invalid Date" for anything unparseable — a blog card should lose a line, not
 * shout about a data problem.
 */
export function formatDate(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(FORMATS[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
