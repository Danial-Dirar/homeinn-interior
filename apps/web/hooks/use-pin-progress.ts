"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { pinProgress } from "@/components/hero/hero-math";

/**
 * Progress through a sticky-pinned section, 0 → 1.
 *
 * `position: sticky` does the pinning; this only reads the section's rect. One
 * rAF per frame at most, and the listener is passive, so scrolling is never
 * blocked on this work.
 */
export function usePinProgress(ref: RefObject<HTMLElement | null>, enabled: boolean): number {
  const [progress, setProgress] = useState(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const element = ref.current;
    if (!element) return;

    const measure = () => {
      frame.current = null;
      const rect = element.getBoundingClientRect();
      setProgress(pinProgress(rect.top, rect.height, window.innerHeight));
    };

    const schedule = () => {
      if (frame.current === null) frame.current = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    };
  }, [ref, enabled]);

  return progress;
}
