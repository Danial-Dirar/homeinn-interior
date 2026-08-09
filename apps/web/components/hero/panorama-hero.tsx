"use client";

import type { Locale } from "@homeinn/types";
import { useTranslations } from "next-intl";
import { useCallback, useRef } from "react";
import { Picture } from "@/components/media/picture";
import type { HeroSegmentView } from "@/lib/api.types";
import { text, textOrNull } from "@/lib/locale-text";
import { useSmoothProgress } from "@/hooks/use-smooth-progress";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { HeroStack } from "./hero-stack";
import {
  driftX, lightPoolX, objectPosition, scrollDistanceVh, segmentOpacity,
} from "./hero-math";

interface PanoramaHeroProps {
  segments: HeroSegmentView[];
  /**
   * The curated phone strip (spec §7): fewer rooms, more scroll each. Falls
   * back to the full set when the CMS has flagged none for mobile.
   */
  mobileSegments?: HeroSegmentView[];
  locale: Locale;
}

/**
 * The scroll hero. One room fills the screen; scrolling crossfades to the next.
 *
 * Spec §7 asks for a horizontal pan through one continuous interior, and that
 * is the right treatment for a stitched panorama. These are photographs of
 * separate rooms, and panning them showed half a kitchen beside half a dining
 * room — the seam masks had nothing to hide because the seam was real. Scroll
 * now snaps to whole segments (see `snappedProgress`), so the hero always comes
 * to rest on one complete photograph.
 *
 * Every per-frame style is written straight to the DOM through refs. React
 * renders this once; re-rendering five full-bleed images sixty times a second
 * is what makes a scroll animation stutter.
 */
export function PanoramaHero({ segments, mobileSegments, locale }: PanoramaHeroProps) {
  const t = useTranslations("home");
  const common = useTranslations("common");
  const reduced = usePrefersReducedMotion();
  const isMobile = useIsMobile();
  const target = isMobile ? "mobile" : "desktop";
  const shown = isMobile && mobileSegments?.length ? mobileSegments : segments;

  const sectionRef = useRef<HTMLElement>(null);
  const lightPoolRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const framesRef = useRef<(HTMLDivElement | null)[]>([]);
  const labelsRef = useRef<(HTMLDivElement | null)[]>([]);

  const count = shown.length;
  const animated = !reduced && count > 1;

  const draw = useCallback(
    (p: number) => {
      for (const [index, frame] of framesRef.current.entries()) {
        const opacity = segmentOpacity(p, index, count);
        if (frame) {
          frame.style.opacity = String(opacity);
          frame.style.transform = `translate3d(${driftX(p, index, count)}vw, 0, 0)`;
          // A fully faded frame must not swallow clicks meant for what is under it.
          frame.style.visibility = opacity === 0 ? "hidden" : "visible";
        }
        const label = labelsRef.current[index];
        if (label) {
          label.style.opacity = String(opacity);
          label.style.transform = `translateY(${(1 - opacity) * 12}px)`;
        }
      }
      if (lightPoolRef.current) {
        lightPoolRef.current.style.background =
          `radial-gradient(60vw 60vh at ${lightPoolX(p, count)}% 45%, ` +
          `color-mix(in oklab, var(--color-amber) 26%, transparent), transparent 70%)`;
      }
      if (progressRef.current) {
        progressRef.current.style.width = `${p * 100}%`;
      }
    },
    [count],
  );

  // `count` as the snap target: the hero rests on whole rooms only.
  useSmoothProgress(sectionRef, animated, draw, count);

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
          <HeroStack segments={shown} locale={locale} />
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
          {shown.map((segment, index) => (
            <div
              key={segment.id}
              ref={(node) => {
                framesRef.current[index] = node;
              }}
              data-hero-frame
              className="absolute inset-0 will-change-[opacity,transform]"
              // Slightly wider than the screen so the drift has somewhere to go
              // without ever exposing an edge.
              style={{
                width: "108vw",
                left: "-4vw",
                opacity: index === 0 ? 1 : 0,
                visibility: index === 0 ? "visible" : "hidden",
              }}
            >
              <Picture
                media={segment.image}
                locale={locale}
                sizes="110vw"
                priority={index === 0}
                className="h-full w-full object-cover"
                style={{ objectPosition: objectPosition(segment.focalX) }}
              />
            </div>
          ))}

          {/* The light pool. Without it the photographs read flat. */}
          <div
            ref={lightPoolRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 mix-blend-screen"
          />

          {/* A floor of ink under the caption, so a bright room stays readable. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-ink to-transparent"
          />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-6 md:p-12">
            <div className="relative h-24">
              {shown.map((segment, index) => {
                const caption = textOrNull(segment, "caption", locale);
                return (
                  <div
                    key={segment.id}
                    ref={(node) => {
                      labelsRef.current[index] = node;
                    }}
                    className="absolute bottom-0 left-0"
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
