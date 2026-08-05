"use client";

import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * The single motion gate for this app (spec §8). Starts `true` on the server and
 * on the first client render so nothing animates before the preference is known
 * — the safe default is stillness, not movement.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(true);

  useEffect(() => {
    const list = window.matchMedia(QUERY);
    setReduced(list.matches);

    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
