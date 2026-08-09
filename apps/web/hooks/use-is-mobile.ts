"use client";

import { useEffect, useState } from "react";

/** Matches the `md` breakpoint the rest of the layout switches on. */
const QUERY = "(max-width: 767px)";

/**
 * Whether this is a phone-width viewport.
 *
 * Starts `false` so the server and the first client render agree on the desktop
 * tree; the mobile hero is a subset beginning with the same photograph, so the
 * LCP image is identical either way and correcting after mount costs nothing.
 */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const list = window.matchMedia(QUERY);
    setMobile(list.matches);
    const onChange = (event: MediaQueryListEvent) => setMobile(event.matches);
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, []);

  return mobile;
}
