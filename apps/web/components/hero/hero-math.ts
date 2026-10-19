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
 * Height of the pinned section, in vh.
 *
 * Desktop: one screenful of scroll per change of room, so a normal gesture
 * advances exactly one room. Phone: a screen to rest on, then 120vh per room
 * for its pan and the rise of the next — the phone hero moves through a room
 * rather than cutting between them, and that needs travel.
 */
const DESKTOP_VH_PER_SEGMENT = 100;
const MOBILE_VH_PER_ROOM = 120;

export function scrollDistanceVh(count: number, target: "desktop" | "mobile"): number {
  if (target === "mobile") return 100 + Math.max(1, count) * MOBILE_VH_PER_ROOM;
  return Math.max(100, (count - 1) * DESKTOP_VH_PER_SEGMENT);
}

/* ── The phone hero: pan across each room, then the next one rises ──────────

   A phone held upright shows about a third of a landscape photograph, so the
   desktop crossfade left each room as a still, cropped middle. Here every
   room owns an equal share of the scroll (room-position x runs 0 → count):

     [k, k+1)              room k is on screen and the camera pans across it,
                           left to right, showing the whole photograph;
     [k+1−H, k+1]          the handover: room k+1 rises from below over it,
                           while room k sinks back.

   The handover is the only place two rooms share the screen, and
   `mobileTarget` never lets the hero rest inside it. */

/** Share of each room's scroll spent handing over to the next. */
export const MOBILE_HANDOVER = 0.3;

export interface MobileFrame {
  /** 0 → 1 as the room rises into view; 1 for the first room. */
  reveal: number;
  /** 0 → 1 across the photograph, left edge to right edge. */
  pan: number;
  /** 0 → 1 as the next room covers it; 0 for the last room. */
  depth: number;
}

export function mobileFrame(p: number, index: number, count: number): MobileFrame {
  const x = clamp01(p) * Math.max(1, count);
  const H = MOBILE_HANDOVER;
  const reveal = index === 0 ? 1 : clamp01((x - (index - H)) / H);
  const depth = index >= count - 1 ? 0 : clamp01((x - (index + 1 - H)) / H);
  const start = index === 0 ? 0 : index - H;
  const pan = clamp01((x - start) / (index + 1 - start));
  return { reveal, pan, depth };
}

/**
 * Where the phone hero comes to rest for a raw scroll position. Inside a room
 * it follows the finger exactly; inside a handover it goes to the nearer end,
 * so a rise always completes or falls back on its own — crisp, never two half
 * rooms.
 */
export function mobileTarget(p: number, count: number): number {
  const n = Math.max(1, count);
  const x = clamp01(p) * n;
  const k = Math.floor(x);
  if (k >= n - 1) return x / n;
  const handoverStart = k + 1 - MOBILE_HANDOVER;
  if (x < handoverStart) return x / n;
  return (x - handoverStart < MOBILE_HANDOVER / 2 ? handoverStart : k + 1) / n;
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

/**
 * A room's name during the handover. The old name leaves through the top in
 * the first half of the rise and the new one comes up from below in the
 * second, so two names never share the line. `y` is a percentage of the
 * name's own height: negative is up and out, positive is still below.
 */
export function mobileLabel(frame: MobileFrame): { opacity: number; y: number } {
  const leaving = clamp01(frame.depth * 2);
  const arriving = clamp01((frame.reveal - 0.5) * 2);
  const opacity = arriving * (1 - leaving);
  const y = leaving > 0 ? -leaving * 100 : (1 - arriving) * 100;
  return { opacity, y: y === 0 ? 0 : y };
}
