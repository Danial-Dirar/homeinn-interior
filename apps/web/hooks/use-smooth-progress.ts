"use client";

import { useEffect, useRef, type RefObject } from "react";
import { approach, pinProgress, snappedProgress } from "@/components/hero/hero-math";

/**
 * How fast the camera chases the scrollbar. Higher is tighter, lower glides
 * further.
 *
 * Deliberately brisk, because Lenis is already smoothing the scroll position
 * this reads from — the two eases compound. At lambda 5 with Lenis at 1.1s a
 * single wheel flick took ~1.95s to come to rest, which reads as syrup rather
 * than momentum. Measure the settle time before changing either number.
 */
const LAMBDA = 9;

/** Longest frame the damping will honour, so a background tab does not jump. */
const MAX_FRAME_SECONDS = 1 / 20;

/**
 * Smoothed progress through a sticky-pinned section.
 *
 * Two things matter here, and both are about how it feels rather than what it
 * computes:
 *
 * 1. **Scroll sets a target, not the position.** The raw rect gives the target;
 *    the value handed to `onFrame` eases toward it. Without this the strip is
 *    welded to the scrollbar and every wheel notch is visible as a step.
 * 2. **Nothing here touches React state.** `onFrame` runs on every animation
 *    frame, and re-rendering a tree of five full-bleed images at 60fps is what
 *    turns a smooth pan into a stuttering one. The caller writes to the DOM.
 *
 * The loop parks itself once the value has settled and restarts on the next
 * scroll, so a still page costs nothing.
 */
export function useSmoothProgress(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
  onFrame: (progress: number) => void,
  /**
   * When set, scroll chooses the nearest of this many whole steps rather than
   * any position between them. The hero passes its segment count, which is what
   * stops it resting on half of one photograph and half of the next.
   */
  snapTo?: number,
): void {
  // Kept in a ref so changing the callback never restarts the loop.
  const callback = useRef(onFrame);
  callback.current = onFrame;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (!enabled) {
      callback.current(0);
      return;
    }

    let target = 0;
    let current = 0;
    let frame: number | null = null;
    let lastTime = 0;

    const readTarget = () => {
      const rect = element.getBoundingClientRect();
      const raw = pinProgress(rect.top, rect.height, window.innerHeight);
      target = snapTo && snapTo > 1 ? snappedProgress(raw, snapTo) : raw;
    };

    const tick = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, MAX_FRAME_SECONDS);
      lastTime = time;

      current = approach(current, target, LAMBDA, dt);
      callback.current(current);

      if (current === target) {
        frame = null; // Settled. Nothing to draw until the next scroll.
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      readTarget();
      if (frame !== null || current === target) return;
      lastTime = performance.now();
      frame = requestAnimationFrame(tick);
    };

    // Jump straight to the target on mount: a page loaded mid-section should
    // render where it belongs, not animate in from the top.
    readTarget();
    current = target;
    callback.current(current);

    window.addEventListener("scroll", start, { passive: true });
    window.addEventListener("resize", start, { passive: true });
    return () => {
      window.removeEventListener("scroll", start);
      window.removeEventListener("resize", start);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [ref, enabled, snapTo]);
}
