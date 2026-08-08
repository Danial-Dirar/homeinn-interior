"use client";

import type { Locale } from "@homeinn/types";
import { useTranslations } from "next-intl";
import { useCallback, useRef } from "react";
import { Picture } from "@/components/media/picture";
import type { HeroSegmentView } from "@/lib/api.types";
import { text, textOrNull } from "@/lib/locale-text";
import { useSmoothProgress } from "@/hooks/use-smooth-progress";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { HeroStack } from "./hero-stack";
import {
  foregroundTranslateX, labelOpacity, lightPoolX, objectPosition, scrollDistanceVh,
  stripTranslateX,
} from "./hero-math";

interface PanoramaHeroProps {
  segments: HeroSegmentView[];
  locale: Locale;
  target: "desktop" | "mobile";
}

/** Spec §7's first seam treatment: adjacent segment edges fade out. */
const SEAM_MASK = "linear-gradient(to right, transparent, black 12%, black 88%, transparent)";

/**
 * Spec §7. Vertical scroll drives a horizontal camera dolly through what reads
 * as one continuous interior. Sticky does the pinning; the strip translates;
 * a faster foreground and a masked edge hide each joint; a warm light pool
 * tracks the camera so the stitched images do not read as a filmstrip.
 *
 * Every per-frame style is written straight to the DOM through refs. React
 * renders this once; the pan is then pure DOM writes, because re-rendering five
 * full-bleed images sixty times a second is exactly what makes a pan stutter.
 *
 * Knows nothing about the CMS. One segment is a static hero, zero segments is
 * a text hero, and a single wide panorama later pans through the same code.
 */
export function PanoramaHero({ segments, locale, target }: PanoramaHeroProps) {
  const t = useTranslations("home");
  const common = useTranslations("common");
  const reduced = usePrefersReducedMotion();

  const sectionRef = useRef<HTMLElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const foregroundRef = useRef<HTMLDivElement>(null);
  const lightPoolRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<(HTMLDivElement | null)[]>([]);

  const count = segments.length;
  const animated = !reduced && count > 1;

  const draw = useCallback(
    (p: number) => {
      if (stripRef.current) {
        stripRef.current.style.transform =
          `translate3d(${stripTranslateX(p, count, 100)}vw, 0, 0)`;
      }
      if (foregroundRef.current) {
        foregroundRef.current.style.transform =
          `translate3d(${foregroundTranslateX(p, count, 100)}vw, 0, 0)`;
      }
      if (lightPoolRef.current) {
        lightPoolRef.current.style.background =
          `radial-gradient(60vw 60vh at ${lightPoolX(p, count)}% 45%, ` +
          `color-mix(in oklab, var(--color-amber) 26%, transparent), transparent 70%)`;
      }
      if (progressRef.current) {
        progressRef.current.style.width = `${p * 100}%`;
      }
      for (const [index, label] of labelsRef.current.entries()) {
        if (!label) continue;
        const opacity = labelOpacity(p, index, count);
        label.style.opacity = String(opacity);
        label.style.transform = `translateY(${(1 - opacity) * 12}px)`;
      }
    },
    [count],
  );

  useSmoothProgress(sectionRef, animated, draw);

  if (count === 0) {
    return (
      <>
        <section aria-label={t("heroFallbackTitle")} className="bg-ink text-sand">
          <div className="mx-auto flex min-h-[80svh] max-w-7xl flex-col justify-end px-5 pb-20">
            <p className="eyebrow">{common("tagline")}</p>
            <h1 className="display-1 mt-4 max-w-3xl text-sand">{t("heroFallbackTitle")}</h1>
          </div>
        </section>
        <div id="after-hero" />
      </>
    );
  }

  if (!animated) {
    return (
      <>
        <section aria-label={t("heroFallbackTitle")}>
          <HeroStack segments={segments} locale={locale} />
        </section>
        <div id="after-hero" />
      </>
    );
  }

  return (
    <>
      <section
        ref={sectionRef}
        aria-label={t("heroFallbackTitle")}
        style={{ height: `${scrollDistanceVh(count, target)}vh` }}
      >
        <div className="sticky top-0 h-dvh overflow-hidden bg-ink">
          <div
            ref={stripRef}
            data-hero-strip
            className="flex h-full will-change-transform"
            style={{ width: `${count * 100}vw` }}
          >
            {segments.map((segment, index) => (
              <div
                key={segment.id}
                className="relative h-full w-screen shrink-0"
                style={{ maskImage: SEAM_MASK, WebkitMaskImage: SEAM_MASK }}
              >
                <Picture
                  media={segment.image}
                  locale={locale}
                  sizes="100vw"
                  priority={index === 0}
                  className="h-full w-full object-cover"
                  style={{ objectPosition: objectPosition(segment.focalX) }}
                />
              </div>
            ))}
          </div>

          {/* Second seam treatment: near-field objects crossing each joint. */}
          <div
            ref={foregroundRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex will-change-transform"
            style={{ width: `${count * 100}vw` }}
          >
            {segments.map((segment) => (
              <div key={segment.id} className="relative h-full w-screen shrink-0">
                {segment.foreground ? (
                  <Picture
                    media={segment.foreground}
                    locale={locale}
                    sizes="100vw"
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
            ))}
          </div>

          {/* The light pool. Without it, stitched images read as flat. */}
          <div
            ref={lightPoolRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 mix-blend-screen"
          />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-6 md:p-12">
            <div className="relative h-24">
              {segments.map((segment, index) => {
                const caption = textOrNull(segment, "caption", locale);
                return (
                  <div
                    key={segment.id}
                    ref={(node) => {
                      labelsRef.current[index] = node;
                    }}
                    className="absolute bottom-0 left-0"
                    // Only the first label is visible before the first frame
                    // runs, which is also where the pan starts.
                    style={{ opacity: index === 0 ? 1 : 0 }}
                  >
                    <p className="display-2 text-sand">{text(segment, "label", locale)}</p>
                    {caption ? <p className="mt-1 text-sand-dim">{caption}</p> : null}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-ink-line">
                <div ref={progressRef} className="h-px bg-brand" style={{ width: "0%" }} />
              </div>
              <p className="eyebrow shrink-0">{t("heroCue")}</p>
            </div>
          </div>

          <a
            href="#after-hero"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:bg-brand focus:px-4 focus:py-2 focus:text-bone"
          >
            {common("skipHero")}
          </a>
        </div>
      </section>
      <div id="after-hero" />
    </>
  );
}
