"use client";

import { useEffect, useRef, useState } from "react";

const REDUCED = "(prefers-reduced-motion: reduce)";

/**
 * Reveals an element the first time it enters the viewport. The whole animation
 * is a CSS transition on the returned flag — no animation runtime, which is what
 * keeps the §7 performance budget reachable on a mid-range Android over 4G.
 *
 * It shows at once, with no animation, whenever it cannot wait safely: when
 * the visitor asked for less motion, and in a browser without
 * IntersectionObserver, where the event it waits for would never come.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    // Ask the media query itself, at mount. Trusting a hook's initial guess
    // once revealed everything on mount — every entrance finished before
    // anyone scrolled to it.
    const reduced = typeof window.matchMedia === "function" && window.matchMedia(REDUCED).matches;
    if (reduced || typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      return;
    }
    const element = ref.current;
    if (!element) return;

    // Keyboard focus arriving counts as being seen: whatever has focus must
    // not be waiting, transparent, for a scroll that may not come.
    const reveal = () => setRevealed(true);
    element.addEventListener("focusin", reveal);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          reveal();
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      element.removeEventListener("focusin", reveal);
    };
  }, []);

  return { ref, revealed };
}
