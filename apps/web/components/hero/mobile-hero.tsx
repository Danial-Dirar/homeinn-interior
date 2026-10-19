"use client";

import type { Locale } from "@homeinn/types";
import { useTranslations } from "next-intl";
import { useCallback, useRef } from "react";
import { Picture } from "@/components/media/picture";
import type { HeroSegmentView } from "@/lib/api.types";
import { text, textOrNull } from "@/lib/locale-text";
import { useSmoothProgress } from "@/hooks/use-smooth-progress";
import { mobileFrame, mobileLabel, objectPosition, scrollDistanceVh } from "./hero-math";

/** How far a room sinks back (scale) while the next one rises over it. */
const SINK = 0.06;
/** How dark a covered room becomes, so the rising one reads as in front. */
const SHADE = 0.6;
/** Share of the rise the photograph itself travels: below 1, it rises into view
    a little slower than its window opens — a gentle parallax. */
const PARALLAX = 0.8;

/** Rounded to a thousandth, so a style reads 0% rather than 0.000%. */
const r3 = (value: number) => Math.round(value * 1000) / 1000;

/**
 * The phone hero. A phone held upright shows about a third of a landscape
 * photograph, so each room is cropped to its main part — its focus point,
 * set per image in the admin panel — and fills the screen. One swipe raises
 * the next room from below while the last one sinks back and darkens.
 *
 * It snaps to whole rooms, like the desktop: let go mid-rise and it finishes,
 * or falls back, on its own. Everything moves by transform and opacity,
 * written straight to the DOM per frame — React renders this once.
 */
export function MobileHero({ segments, locale }: { segments: HeroSegmentView[]; locale: Locale }) {
  const t = useTranslations("home");
  const common = useTranslations("common");
  const count = segments.length;

  const sectionRef = useRef<HTMLElement>(null);
  const frames = useRef<(HTMLDivElement | null)[]>([]);
  const lifts = useRef<(HTMLDivElement | null)[]>([]);
  const shades = useRef<(HTMLDivElement | null)[]>([]);
  const labels = useRef<(HTMLDivElement | null)[]>([]);
  const marks = useRef<(HTMLSpanElement | null)[]>([]);

  const draw = useCallback(
    (p: number) => {
      for (let i = 0; i < count; i++) {
        const state = mobileFrame(p, i, count);
        const { reveal, depth } = state;
        const frame = frames.current[i];
        if (frame) {
          frame.style.transform = `translate3d(0px, ${r3((1 - reveal) * 100)}%, 0px) scale(${r3(1 - SINK * depth)})`;
          // Not yet risen, or fully covered: nothing to paint.
          frame.style.visibility = reveal === 0 || depth === 1 ? "hidden" : "visible";
        }
        const lift = lifts.current[i];
        if (lift) {
          lift.style.transform =
            `translate3d(0px, ${r3(-(1 - reveal) * 100 * PARALLAX)}%, 0px) scale(${r3(1 + 0.08 * (1 - reveal))})`;
        }
        const shade = shades.current[i];
        if (shade) shade.style.opacity = String(r3(SHADE * depth));

        const label = labels.current[i];
        if (label) {
          // Out through the top, then in from below: one name at a time.
          const { opacity, y } = mobileLabel(state);
          label.style.transform = `translate3d(0px, ${r3(y)}%, 0px)`;
          label.style.opacity = String(r3(opacity));
          if (opacity >= 0.5) label.removeAttribute("aria-hidden");
          else label.setAttribute("aria-hidden", "true");
        }
        const mark = marks.current[i];
        if (mark) mark.style.transform = `scaleX(${r3(reveal)})`;
      }
    },
    [count],
  );

  // `count` as the snap target: the hero rests on whole rooms only.
  useSmoothProgress(sectionRef, true, draw, count);

  return (
    <>
      <section
        ref={sectionRef}
        aria-label={t("heroFallbackTitle")}
        data-hero="mobile"
        style={{ height: `${scrollDistanceVh(count, "mobile")}vh` }}
      >
        <div className="ground-ink ground-photo sticky top-0 h-dvh overflow-hidden bg-ink">
          {segments.map((segment, index) => (
            <div
              key={segment.id}
              ref={(node) => {
                frames.current[index] = node;
              }}
              data-hero-frame
              className="absolute inset-0 overflow-hidden will-change-transform"
              style={{
                zIndex: index,
                transform: `translate3d(0px, ${index === 0 ? 0 : 100}%, 0px) scale(1)`,
                visibility: index === 0 ? "visible" : "hidden",
              }}
            >
              <div
                ref={(node) => {
                  lifts.current[index] = node;
                }}
                className="absolute inset-0 will-change-transform"
              >
                {/* Cropped to the room's main part: its focus point, set per
                    image in the admin panel (Hero → Focus point). */}
                <Picture
                  media={segment.image}
                  locale={locale}
                  sizes="100vw"
                  priority={index === 0}
                  className="h-full w-full object-cover"
                  style={{ objectPosition: objectPosition(segment.focalX) }}
                />
              </div>
              <div
                ref={(node) => {
                  shades.current[index] = node;
                }}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-ink"
                style={{ opacity: 0 }}
              />
            </div>
          ))}

          {/* A floor of ink under the names, so a bright room stays readable. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[60] h-1/2 bg-gradient-to-t from-ink via-ink/60 to-transparent"
          />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[70] px-6 pb-8 text-sand">
            {/* The mask the names rise through. */}
            <div className="relative h-24 overflow-hidden">
              {segments.map((segment, index) => {
                const caption = textOrNull(segment, "caption", locale);
                return (
                  <div
                    key={segment.id}
                    ref={(node) => {
                      labels.current[index] = node;
                    }}
                    data-hero-label
                    aria-hidden={index === 0 ? undefined : true}
                    className="absolute bottom-0 left-0 will-change-transform"
                    style={{
                      opacity: index === 0 ? 1 : 0,
                      transform: `translate3d(0px, ${index === 0 ? 0 : 100}%, 0px)`,
                    }}
                  >
                    <p className="display-2 text-sand">{text(segment, "label", locale)}</p>
                    {caption ? <p className="mt-1 text-sand-dim">{caption}</p> : null}
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex items-center gap-4">
              <div data-hero-progress aria-hidden="true" className="flex flex-1 gap-1.5">
                {segments.map((segment, index) => (
                  <span key={segment.id} className="h-0.5 flex-1 overflow-hidden bg-ink-line">
                    <span
                      ref={(node) => {
                        marks.current[index] = node;
                      }}
                      className="block h-full origin-left bg-accent"
                      style={{ transform: `scaleX(${index === 0 ? 1 : 0})` }}
                    />
                  </span>
                ))}
              </div>
              <p className="eyebrow shrink-0">{t("heroCue")}</p>
            </div>
          </div>

          <a
            href="#after-hero"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:bg-brand focus:px-4 focus:py-2 focus:text-bone"
          >
            {common("skipHero")}
          </a>
        </div>
      </section>
      <div id="after-hero" />
    </>
  );
}
