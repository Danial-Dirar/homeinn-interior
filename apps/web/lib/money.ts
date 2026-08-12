import type { Locale } from "@homeinn/types";

/**
 * Formats a price held in **poisha** as taka.
 *
 * Prices are integers all the way from the database so nothing ever rounds a
 * float; the division happens once, here, at the moment of display. Bangla gets
 * Bangla numerals, which `Intl` handles once given the right locale.
 */
export function formatTaka(poisha: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-BD", {
    style: "currency",
    currency: "BDT",
    currencyDisplay: "narrowSymbol",
    // Furniture is priced in whole taka; ".00" on every card is noise.
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(poisha / 100);
}
