"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useReveal } from "@/hooks/use-reveal";

/** The words assemble one at a time, in this order. */
const WORDS = ["custom", "designed", "furniture"] as const;

/**
 * The "Custom Designed Furniture" moment.
 *
 * It sits to the right of the catalogue and builds itself as it comes into
 * view: a hairline draws down, then the three words rise in one at a time. The
 * whole thing is CSS transitions keyed off a single `revealed` flag from
 * `useReveal`, which is already gated on prefers-reduced-motion — so a visitor
 * who asked for stillness gets the finished composition immediately rather than
 * a version with the animation stripped out.
 *
 * Sticky, so it holds while the products scroll past it. That is the whole
 * idea: every piece in the list is one of these.
 */
export function CustomBuiltPanel() {
  const t = useTranslations("furniture");
  const { ref, revealed } = useReveal<HTMLDivElement>();

  return (
    <aside
      ref={ref}
      className="lg:sticky lg:top-28"
      // The whole panel leaves the accessibility tree until it reveals, rather
      // than sitting there as invisible text axe reads as a contrast failure.
      style={{ visibility: revealed ? "visible" : "hidden" }}
    >
      <div className="relative pl-6">
        {/* The rule draws downward, then the words arrive against it. */}
        <span
          aria-hidden="true"
          className="absolute left-0 top-0 w-px origin-top bg-brand transition-transform duration-700 ease-out"
          style={{ height: "100%", transform: `scaleY(${revealed ? 1 : 0})` }}
        />

        <p
          className="eyebrow text-current/70 transition-all duration-500"
          style={{
            opacity: revealed ? 1 : 0,
            transform: `translateY(${revealed ? 0 : 8}px)`,
          }}
        >
          {t("customEyebrow")}
        </p>

        {/* One word per line, each on its own delay, so it reads as a phrase
            being written rather than a block fading in. */}
        <h2 className="display-1 mt-4 leading-[0.95]">
          {WORDS.map((word, index) => (
            <span key={word} className="block overflow-hidden">
              {/* Slides out from behind the mask rather than fading in. No
                  opacity means no moment where this is unreadable text sitting
                  on the page — the parent's overflow does the hiding. */}
              <span
                className="block transition-transform duration-700 ease-out"
                style={{
                  transform: `translateY(${revealed ? 0 : 100}%)`,
                  transitionDelay: `${150 + index * 130}ms`,
                }}
              >
                {t(`customWord${index + 1}`)}
              </span>
            </span>
          ))}
        </h2>

        <p
          className="mt-8 max-w-sm text-lg text-current/70 transition-all duration-700 ease-out"
          style={{
            opacity: revealed ? 1 : 0,
            transform: `translateY(${revealed ? 0 : 12}px)`,
            transitionDelay: "560ms",
          }}
        >
          {t("customBody")}
        </p>

        <Link
          href="/contact"
          className="mt-8 inline-block underline underline-offset-4 transition-all duration-700 ease-out hover:text-accent"
          style={{
            opacity: revealed ? 1 : 0,
            transform: `translateY(${revealed ? 0 : 12}px)`,
            transitionDelay: "680ms",
          }}
        >
          {t("customCta")}
        </Link>
      </div>
    </aside>
  );
}
