"use client";

import type { CSSProperties } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { useReveal } from "@/hooks/use-reveal";

/**
 * Home Inn's own floor plans (PDF References/Drawings), rasterised once to
 * line art held in the alpha channel. The ratio is the file's own.
 */
const PLANS = {
  "ground-floor": { src: "/blueprints/ground-floor.webp", ratio: "1600 / 1356" },
  "first-floor": { src: "/blueprints/first-floor.webp", ratio: "1600 / 1357" },
} as const;

export type PlanName = keyof typeof PLANS;

/**
 * A floor plan that draws itself in, left to right, like a plotter.
 *
 * The plan is a CSS mask over `currentColor`, so its lines take the colour of
 * whatever ground it sits on and follow the theme without a second asset. The
 * reveal is one `clip-path` transition with a thin accent bar on its leading
 * edge. Under reduced motion it is simply there, complete, with no pen.
 * Decorative unless it is given a label.
 */
export function Blueprint({
  plan,
  label,
  className = "",
}: {
  plan: PlanName;
  label?: string;
  className?: string;
}) {
  const { ref, revealed } = useReveal<HTMLDivElement>();
  const reduced = usePrefersReducedMotion();
  const { src, ratio } = PLANS[plan];
  const mask = `url(${src})`;

  const lines: CSSProperties = {
    maskImage: mask,
    WebkitMaskImage: mask,
    maskSize: "contain",
    WebkitMaskSize: "contain",
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
    maskPosition: "center",
    WebkitMaskPosition: "center",
    clipPath: revealed ? "inset(0px 0% 0px 0px)" : "inset(0px 100% 0px 0px)",
  };

  return (
    <div
      ref={ref}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-revealed={revealed}
      className={`relative ${className}`}
      style={{ aspectRatio: ratio }}
    >
      <div
        data-blueprint-lines
        className="absolute inset-0 bg-current motion-safe:transition-[clip-path] motion-safe:duration-[2400ms] motion-safe:ease-in-out"
        style={lines}
      />
      {reduced ? null : (
        <span
          data-blueprint-pen
          aria-hidden="true"
          className="absolute inset-y-0 w-px bg-accent transition-[left,opacity] duration-[2400ms] ease-in-out"
          style={{ left: revealed ? "100%" : "0%", opacity: revealed ? 0 : 1 }}
        />
      )}
    </div>
  );
}
