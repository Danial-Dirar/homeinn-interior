const BASE83 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~";

/** `ink-raised` — the ground an image sits on before it has decoded. */
export const PLACEHOLDER_COLOR = "#141416";

function decode83(chars: string): number {
  let value = 0;
  for (const char of chars) {
    const digit = BASE83.indexOf(char);
    if (digit < 0) return -1;
    value = value * 83 + digit;
  }
  return value;
}

/**
 * The average colour a blurhash encodes, as `#rrggbb`.
 *
 * Characters 2–6 of a blurhash are the base83-encoded 24-bit sRGB DC component,
 * so the average is readable without decoding the AC components or touching a
 * canvas. That keeps the placeholder server-renderable — which matters, because
 * the first hero segment is the LCP element (spec §7).
 */
export function blurhashAverageColor(hash: string | null | undefined): string {
  if (!hash || hash.length < 6) return PLACEHOLDER_COLOR;
  const dc = decode83(hash.slice(2, 6));
  if (dc < 0) return PLACEHOLDER_COLOR;
  return `#${(dc & 0xffffff).toString(16).padStart(6, "0")}`;
}

/** The URL of the widest candidate in a srcset, for the `<img>` fallback `src`. */
export function largestSrc(srcset: string): string {
  let best = "";
  let bestWidth = -1;
  for (const candidate of srcset.split(",")) {
    const [url, descriptor] = candidate.trim().split(/\s+/);
    if (!url) continue;
    const width = Number.parseInt(descriptor ?? "0", 10) || 0;
    if (width > bestWidth) {
      bestWidth = width;
      best = url;
    }
  }
  return best;
}
