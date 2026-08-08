/**
 * The scroll panorama's arithmetic (spec §7), with no DOM in sight.
 *
 * The model: N segments, each exactly one viewport wide, laid out in a strip.
 * Pin progress `p` runs 0 → 1 across the section's scroll distance, and the
 * strip translates left so that at p = 0 segment 0 fills the viewport and at
 * p = 1 segment N-1 does. Every other quantity — label crossfades, the light
 * pool, the parallax foreground — is a function of that one number.
 */

export function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function stripWidth(count: number, viewportWidth: number): number {
  return count * viewportWidth;
}

/** How far the strip can travel before its last segment is flush with the right edge. */
function travel(count: number, viewportWidth: number): number {
  return Math.max(0, stripWidth(count, viewportWidth) - viewportWidth);
}

export function stripTranslateX(p: number, count: number, viewportWidth: number): number {
  const distance = clamp01(p) * travel(count, viewportWidth);
  // Negating zero yields -0, which would reach CSS as `translate3d(-0vw, …)`.
  return distance === 0 ? 0 : -distance;
}

/**
 * Spec §7: a column, curtain or plant straddling each joint moves at ~1.35× the
 * strip's rate. The eye reads the faster object as near-field and stops looking
 * for the seam behind it.
 */
export const FOREGROUND_RATE = 1.35;

export function foregroundTranslateX(p: number, count: number, viewportWidth: number): number {
  return stripTranslateX(p, count, viewportWidth) * FOREGROUND_RATE;
}

/** The span of `p` over which segment `index` is the one on screen. */
export function segmentWindow(index: number, count: number): { start: number; end: number } {
  if (count <= 1) return { start: 0, end: 1 };
  const step = 1 / (count - 1);
  const centre = index * step;
  return { start: centre - step / 2, end: centre + step / 2 };
}

/** Full opacity within this much of a step from the centre. */
const LABEL_PLATEAU = 0.35;
/** Fully faded by this much of a step from the centre. */
const LABEL_FADE_END = 0.9;

export function labelOpacity(p: number, index: number, count: number): number {
  if (count <= 1) return 1;
  const step = 1 / (count - 1);
  const distance = Math.abs(clamp01(p) - index * step) / step;

  if (distance <= LABEL_PLATEAU) return 1;
  if (distance >= LABEL_FADE_END) return 0;
  return 1 - (distance - LABEL_PLATEAU) / (LABEL_FADE_END - LABEL_PLATEAU);
}

/** Half-width of the light pool's sweep, in viewport percent. */
const LIGHT_POOL_SWING = 22;

/**
 * Where the warm radial gradient sits, as a percentage of the viewport width.
 * One oscillation per segment, so the pool passes across each room as the
 * camera does. Without it, stitched images read as a flat filmstrip (spec §7).
 */
export function lightPoolX(p: number, count: number): number {
  if (count <= 1) return 50;
  const travelled = clamp01(p) * (count - 1);
  return 50 + LIGHT_POOL_SWING * Math.sin(travelled * Math.PI * 2);
}

/**
 * Scroll distance for the pinned section, in vh. A phone screen is narrow, so
 * the same pan feels twice as fast there and needs more scroll per segment.
 * These constants reproduce spec §7's stated 500vh for six desktop segments and
 * 300vh for three mobile ones.
 */
const VH_PER_SEGMENT = { desktop: 100, mobile: 150 } as const;

export function scrollDistanceVh(count: number, target: "desktop" | "mobile"): number {
  return Math.max(100, (count - 1) * VH_PER_SEGMENT[target]);
}

/**
 * Progress through a pinned section, derived from its bounding rect. `rectTop`
 * is `getBoundingClientRect().top` — 0 when the section's top meets the viewport
 * top, then increasingly negative as it scrolls past.
 */
export function pinProgress(
  rectTop: number,
  sectionHeight: number,
  viewportHeight: number,
): number {
  const distance = sectionHeight - viewportHeight;
  if (distance <= 0) return 0;
  return clamp01(-rectTop / distance);
}

/** `object-position` from a segment's `focalX`, so the subject survives any crop. */
export function objectPosition(focalX: number): string {
  return `${clamp01(focalX) * 100}% 50%`;
}

/** Closer than this to the target and it may as well be the target. */
const SETTLED = 0.0001;

/**
 * Moves `current` a fraction of the way toward `target`, exponentially.
 *
 * This is what stops the strip being welded to the scrollbar. Raw scroll
 * position drives the *target*; the strip chases it, so a flick of the wheel
 * sets a destination and the camera glides there instead of stepping with each
 * wheel notch.
 *
 * `lambda` is a rate, not a per-frame fraction, and `dt` is in seconds — so the
 * motion is identical on a 60Hz and a 144Hz display. A naive
 * `current += (target - current) * 0.1` would run nearly two and a half times
 * faster on the 144Hz screen.
 */
export function approach(current: number, target: number, lambda: number, dt: number): number {
  if (dt <= 0) return current;
  const next = target + (current - target) * Math.exp(-lambda * dt);
  return Math.abs(target - next) < SETTLED ? target : next;
}
