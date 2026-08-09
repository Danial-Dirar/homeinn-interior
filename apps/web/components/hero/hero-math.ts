/**
 * The scroll hero's arithmetic (spec §7), with no DOM in sight.
 *
 * The model: N room photographs, each filling the screen. Pin progress `p` runs
 * 0 → 1 across the section's scroll distance and is mapped onto a segment
 * index, so `p = 0` is the first room and `p = 1` is the last.
 *
 * Spec §7 describes a horizontal strip that pans through one continuous
 * interior. That only works when the photographs genuinely stitch — adjacent
 * frames of a single space. The client's archive is discrete rooms, so panning
 * put half a kitchen beside half a dining room and the seam treatments had
 * nothing to hide. One room at a time, crossfaded, is the honest presentation
 * for discrete photographs. If a true stitched panorama ever arrives, the pan
 * belongs back here.
 */

export function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/** Where `p` sits on the 0…N-1 scale of segments. */
function position(p: number, count: number): number {
  if (count <= 1) return 0;
  return clamp01(p) * (count - 1);
}

/** The room the camera is closest to. */
export function snapIndex(p: number, count: number): number {
  if (count <= 1) return 0;
  return Math.min(count - 1, Math.max(0, Math.round(position(p, count))));
}

/**
 * The progress the hero actually rests at: the nearest whole segment.
 *
 * This is what guarantees a full room rather than two halves. Raw scroll picks
 * which room; the damping eases to this quantised value, so every resting state
 * is exactly one photograph at full opacity.
 */
export function snappedProgress(p: number, count: number): number {
  if (count <= 1) return 0;
  return snapIndex(p, count) / (count - 1);
}

/**
 * How visible segment `index` is. Exactly 1 at its own position, 0 at its
 * neighbour's, linear in between — so the pair always sums to 1 during a
 * crossfade and no frame is ever a wash of three images.
 */
export function segmentOpacity(p: number, index: number, count: number): number {
  if (count <= 1) return 1;
  return clamp01(1 - Math.abs(position(p, count) - index));
}

/** How far a segment drifts, in vw. Small enough never to reveal its neighbour. */
const DRIFT_VW = 4;

/**
 * A slow sideways drift on each photograph, so a still frame is not completely
 * static. Zero when the segment is centred, which keeps the resting state
 * exactly as composed.
 */
export function driftX(p: number, index: number, count: number): number {
  if (count <= 1) return 0;
  const distance = Math.max(-1, Math.min(1, position(p, count) - index));
  // Negating zero yields -0, which would reach CSS as `translate3d(-0vw, …)`.
  return distance === 0 ? 0 : -distance * DRIFT_VW;
}

/** Half-width of the light pool's sweep, in viewport percent. */
const LIGHT_POOL_SWING = 22;

/**
 * Where the warm radial gradient sits, as a percentage of the viewport width.
 * One oscillation per room, so the pool crosses each space as the camera
 * arrives. Without it the photographs read flat (spec §7).
 */
export function lightPoolX(p: number, count: number): number {
  if (count <= 1) return 50;
  return 50 + LIGHT_POOL_SWING * Math.sin(position(p, count) * Math.PI * 2);
}

/**
 * Scroll distance for the pinned section, in vh — one screenful of scroll per
 * room, so a normal gesture advances exactly one room. Mobile gets more,
 * because a phone screen makes the same change of view feel abrupt.
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
