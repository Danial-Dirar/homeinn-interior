import type { CSSProperties, ReactNode } from "react";
import { cn } from "../lib/utils";

interface MarqueeProps {
  children: ReactNode;
  /** One full pass of the track, in seconds. Slower reads as calmer. */
  speedSeconds?: number;
  className?: string;
}

/**
 * A CSS-only horizontal loop. The track is rendered twice so the seam falls
 * outside the viewport; the copy is aria-hidden so a screen reader hears the
 * list once. Animation stops entirely under prefers-reduced-motion, leaving a
 * static, horizontally scrollable row.
 */
export function Marquee({ children, speedSeconds = 45, className }: MarqueeProps) {
  const track =
    "flex shrink-0 items-center gap-12 pr-12 motion-safe:animate-[marquee_var(--marquee-duration)_linear_infinite] motion-safe:group-hover:[animation-play-state:paused]";

  return (
    <div
      className={cn("group relative flex overflow-x-auto motion-safe:overflow-hidden", className)}
      style={{ "--marquee-duration": `${speedSeconds}s` } as CSSProperties}
    >
      <div data-marquee-track className={track}>
        {children}
      </div>
      <div data-marquee-track aria-hidden="true" className={cn(track, "hidden motion-safe:flex")}>
        {children}
      </div>
    </div>
  );
}
