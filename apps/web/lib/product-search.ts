import type { Locale } from "@homeinn/types";
import type { ProductView } from "./api.types";

/** Price bands, in poisha, matching the way people actually shop for furniture. */
export const PRICE_BANDS = {
  any: null,
  under50k: { min: 0, max: 5_000_000 },
  "50kTo1lakh": { min: 5_000_000, max: 10_000_000 },
  over1lakh: { min: 10_000_000, max: Number.MAX_SAFE_INTEGER },
} as const;

export type PriceBand = keyof typeof PRICE_BANDS;

export interface ProductQuery {
  text: string;
  band: PriceBand;
  /** Only pieces built to order. */
  madeToOrderOnly: boolean;
}

export const EMPTY_QUERY: ProductQuery = { text: "", band: "any", madeToOrderOnly: false };

/**
 * Normalises for comparison: case-folded, accent-stripped, collapsed spaces.
 * Bangla has no case, but `toLowerCase` is harmless there and the NFKD pass
 * makes a search for "designed" match "Designed".
 */
function fold(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Filters the catalogue.
 *
 * Text matches the name and the summary **in the reader's own language** — a
 * Bangla visitor typing "আলমারি" should find the wardrobe, and searching the
 * English fields for them would be useless. Every space-separated word must
 * match somewhere, so "wooden wardrobe" narrows rather than widens.
 *
 * A piece with no price is excluded by any band but "any": it has no figure to
 * compare, and silently treating "quote only" as cheap would mislead.
 */
export function filterProducts(
  products: ProductView[],
  query: ProductQuery,
  locale: Locale,
): ProductView[] {
  const words = fold(query.text).split(" ").filter(Boolean);
  const band = PRICE_BANDS[query.band];

  return products.filter((product) => {
    if (query.madeToOrderOnly && !product.madeToOrder) return false;

    if (band) {
      if (product.priceBdt === null) return false;
      if (product.priceBdt < band.min || product.priceBdt >= band.max) return false;
    }

    if (words.length === 0) return true;

    const haystack = fold(
      locale === "bn"
        ? `${product.nameBn} ${product.summaryBn}`
        : `${product.nameEn} ${product.summaryEn}`,
    );
    return words.every((word) => haystack.includes(word));
  });
}
