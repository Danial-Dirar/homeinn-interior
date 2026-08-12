"use client";

import type { Locale } from "@homeinn/types";
import { Input, Label } from "@homeinn/ui";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import type { ProductView } from "@/lib/api.types";
import { EMPTY_QUERY, filterProducts, type PriceBand } from "@/lib/product-search";
import { ProductCard } from "./product-card";

const BANDS: PriceBand[] = ["any", "under50k", "50kTo1lakh", "over1lakh"];

const CONTROL =
  "h-11 w-full min-w-0 border border-ink/20 bg-transparent px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

/**
 * The searchable catalogue.
 *
 * Filtering happens in the browser over the full list. That is the right call
 * at this size — six pieces, and even a few hundred would be a smaller payload
 * than a round trip per keystroke. If the catalogue ever outgrows that, the
 * query object is already the shape a server route would take.
 */
export function ProductCatalogue({
  products,
  locale,
}: {
  products: ProductView[];
  locale: Locale;
}) {
  const t = useTranslations("furniture");
  const [query, setQuery] = useState(EMPTY_QUERY);

  const results = useMemo(
    () => filterProducts(products, query, locale),
    [products, query, locale],
  );

  return (
    <div>
      <form
        role="search"
        // Nothing to submit — results update as you type. Stopping the default
        // keeps Enter from reloading the page.
        onSubmit={(event) => event.preventDefault()}
        className="grid gap-4 border-y border-ink/10 py-6 sm:grid-cols-[1fr_auto_auto] sm:items-end"
      >
        <div className="grid min-w-0 gap-2">
          <Label htmlFor="furniture-search">{t("searchLabel")}</Label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/40"
            />
            <Input
              id="furniture-search"
              type="search"
              value={query.text}
              onChange={(event) => setQuery((q) => ({ ...q, text: event.target.value }))}
              placeholder={t("searchPlaceholder")}
              className="pl-9"
            />
          </div>
        </div>

        <div className="grid min-w-0 gap-2">
          <Label htmlFor="furniture-price">{t("priceLabel")}</Label>
          <select
            id="furniture-price"
            value={query.band}
            onChange={(event) =>
              setQuery((q) => ({ ...q, band: event.target.value as PriceBand }))
            }
            className={CONTROL}
          >
            {BANDS.map((band) => (
              <option key={band} value={band}>
                {t(`band_${band}`)}
              </option>
            ))}
          </select>
        </div>

        <label className="flex h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={query.madeToOrderOnly}
            onChange={(event) =>
              setQuery((q) => ({ ...q, madeToOrderOnly: event.target.checked }))
            }
            className="size-4 accent-[--color-brand]"
          />
          {t("madeToOrder")}
        </label>
      </form>

      {/* Announced politely so a screen-reader user hears the count change
          without the page stealing focus on every keystroke. */}
      <p role="status" aria-live="polite" className="mt-6 text-sm text-ink/70">
        {t("resultCount", { count: results.length })}
      </p>

      {results.length === 0 ? (
        <p className="mt-10 max-w-md text-ink/70">{t("noResults")}</p>
      ) : (
        <ul className="mt-10 grid gap-10 sm:grid-cols-2">
          {results.map((product, index) => (
            <ProductCard
              // Keyed by slug so a filtered-out card unmounts rather than
              // being recycled mid-reveal into a different product.
              key={product.slug}
              product={product}
              locale={locale}
              index={index}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
