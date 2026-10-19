"use client";

import { useEffect, useState } from "react";

/**
 * True once the home page's hero has scrolled away: the `#after-hero` marker
 * that follows it has reached the middle of the screen. The pinned hero is
 * several screens of scroll on a phone, so a fixed pixel threshold showed
 * floating buttons on top of it. Without the marker, falls back to `fallback`
 * pixels of scroll.
 */
export function usePastHero(fallback = 300): boolean {
  const [past, setPast] = useState(false);

  useEffect(() => {
    const check = () => {
      const marker = document.getElementById("after-hero");
      setPast(marker ? marker.getBoundingClientRect().top <= window.innerHeight * 0.5 : window.scrollY > fallback);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check, { passive: true });
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [fallback]);

  return past;
}
