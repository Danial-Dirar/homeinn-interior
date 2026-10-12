"use client";

import type { Locale } from "@homeinn/types";
import { useTranslations } from "next-intl";
import { Picture } from "@/components/media/picture";
import { Link } from "@/i18n/navigation";
import type { ProductView } from "@/lib/api.types";
import { text } from "@/lib/locale-text";
import { formatTaka } from "@/lib/money";
import { useReveal } from "@/hooks/use-reveal";

/**
 * One furniture piece.
 *
 * Rises into place as it enters the viewport, staggered by its position in the
 * list so the catalogue assembles rather than appearing all at once. The
 * stagger is capped — past a handful of items the delay would be longer than
 * anyone waits.
 */
export function ProductCard({
  product,
  locale,
  index,
}: {
  product: ProductView;
  locale: Locale;
  index: number;
}) {
  const t = useTranslations("furniture");
  const { ref, revealed } = useReveal<HTMLLIElement>();

  return (
    <li
      ref={ref}
      className="group transition-all duration-700 ease-out"
      style={{
        opacity: revealed ? 1 : 0,
        transform: `translateY(${revealed ? 0 : 24}px)`,
        transitionDelay: `${Math.min(index, 3) * 90}ms`,
        // Not just transparent — out of the accessibility tree entirely while
        // it waits, so it is never read as unreadable text.
        visibility: revealed ? "visible" : "hidden",
      }}
    >
      <Link href={`/furniture/${product.slug}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-ink-raised">
          {product.cover ? (
            <Picture
              media={product.cover}
              locale={locale}
              sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
              className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
            />
          ) : null}

          {product.madeToOrder ? (
            <span className="absolute left-4 top-4 bg-bone/90 px-3 py-1 text-[0.65rem] uppercase tracking-[0.14em] text-ink">
              {t("madeToOrder")}
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex items-baseline justify-between gap-4">
          <h3 className="heading">{text(product, "name", locale)}</h3>
          <p className="shrink-0 text-sm">
            {/* A missing price is a real state, not a gap to paper over: some
                pieces are quoted per bay rather than sold at a figure. */}
            {product.priceBdt === null
              ? t("onRequest")
              : formatTaka(product.priceBdt, locale)}
          </p>
        </div>
        <p className="mt-1 text-sm text-current/65">{text(product, "summary", locale)}</p>
      </Link>
    </li>
  );
}
