"use client";

import type { Locale } from "@homeinn/types";
import { Input, Label } from "@homeinn/ui";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, type ReactNode } from "react";
import type { ProductView } from "@/lib/api.types";
import { EMPTY_QUERY, filterProducts, type PriceBand } from "@/lib/product-search";
import { ProductCard } from "./product-card";

const BANDS: PriceBand[] = ["any", "under50k", "50kTo1lakh", "over1lakh"];

const CONTROL =
  "h-11 w-full min-w-0 border border-ink/20 bg-transparent px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** One column split, used by both rows so the page reads as two columns. */
const COLUMNS = "grid gap-10 lg:grid-cols-[1.6fr_1fr] lg:gap-20";

/**
 * The searchable catalogue, and the page's whole two-column body.
 *
 * The search sits in the **right** column beside the title rather than in a
 * band above the grid: in a band it lined up with nothing, while here it shares
 * a column edge with the "Custom Designed Furniture" panel below it, so the
 * page has one spine instead of two competing ones. Owning both rows is what
 * lets the filter state stay in one place while the controls live up there.
 *
 * Filtering happens in the browser over the full list — right at six pieces,
 * and even a few hundred would be a smaller payload than a round trip per
 * keystroke. If it ever outgrows that, `ProductQuery` is already the shape a
 * server route would take.
 */
export function ProductCatalogue({
  products,
  locale,
  title,
  intro,
  aside,
}: {
  products: ProductView[];
  locale: Locale;
  title: string;
  intro: string;
  aside: ReactNode;
}) {
  const t = useTranslations("furniture");
  const [query, setQuery] = useState(EMPTY_QUERY);

  const results = useMemo(
    () => filterProducts(products, query, locale),
    [products, query, locale],
  );

  return (
    <>
      <div className={COLUMNS}>
        <div>
          <h1 className="display-1">{title}</h1>
          <p className="mt-6 max-w-2xl text-lg text-ink/70">{intro}</p>
        </div>

        <form
          role="search"
          // Nothing to submit — results update as you type. Stopping the
          // default keeps Enter from reloading the page.
          onSubmit={(event) => event.preventDefault()}
          className="grid content-start gap-4 lg:pt-3"
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

          <div className="flex flex-wrap items-end gap-4">
            <div className="grid min-w-0 flex-1 gap-2">
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

            <label className="flex h-11 shrink-0 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={query.madeToOrderOnly}
                onChange={(event) =>
                  setQuery((q) => ({ ...q, madeToOrderOnly: event.target.checked }))
                }
                className="size-4 accent-brand"
              />
              {t("madeToOrder")}
            </label>
          </div>
        </form>
      </div>

      <div className={`${COLUMNS} mt-16 lg:mt-20`}>
        <div>
          {/* Announced politely so a screen-reader user hears the count change
              without the page stealing focus on every keystroke. */}
          <p role="status" aria-live="polite" className="text-sm text-ink/70">
            {t("resultCount", { count: results.length })}
          </p>

          {results.length === 0 ? (
            <p className="mt-10 max-w-md text-ink/70">{t("noResults")}</p>
          ) : (
            <ul className="mt-8 grid gap-10 sm:grid-cols-2">
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

        {aside}
      </div>
    </>
  );
}
