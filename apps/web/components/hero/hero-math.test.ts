import { describe, expect, it } from "vitest";
import {
  FOREGROUND_RATE, approach, clamp01, foregroundTranslateX, labelOpacity, lightPoolX,
  objectPosition, pinProgress, scrollDistanceVh, segmentWindow, stripTranslateX, stripWidth,
} from "./hero-math";

describe("clamp01", () => {
  it("clamps below and above", () => {
    expect(clamp01(-3)).toBe(0);
    expect(clamp01(4)).toBe(1);
    expect(clamp01(0.5)).toBe(0.5);
  });
});

describe("stripWidth", () => {
  it("is one viewport per segment", () => {
    expect(stripWidth(6, 1440)).toBe(8640);
  });
});

describe("stripTranslateX", () => {
  it("starts at zero", () => {
    expect(stripTranslateX(0, 6, 1440)).toBe(0);
  });

  it("ends with the last segment exactly filling the viewport", () => {
    // Travel is stripWidth - viewportWidth, never more: the strip must not
    // over-scroll past its final segment.
    expect(stripTranslateX(1, 6, 1440)).toBe(-(6 * 1440 - 1440));
  });

  it("is linear in p", () => {
    expect(stripTranslateX(0.5, 6, 1440)).toBe(-(6 * 1440 - 1440) / 2);
  });

  it("does not move a single-segment strip", () => {
    expect(stripTranslateX(1, 1, 1440)).toBe(0);
  });

  it("clamps out-of-range progress", () => {
    expect(stripTranslateX(-1, 6, 1440)).toBe(0);
    expect(stripTranslateX(2, 6, 1440)).toBe(stripTranslateX(1, 6, 1440));
  });
});

describe("foregroundTranslateX", () => {
  it("moves faster than the strip, so it reads as near-field depth", () => {
    // Spec §7: the foreground straddles each joint at ~1.35x the strip's rate,
    // which is what stops the eye hunting for the seam.
    expect(FOREGROUND_RATE).toBeGreaterThan(1);
    expect(foregroundTranslateX(0.5, 6, 1440))
      .toBeCloseTo(stripTranslateX(0.5, 6, 1440) * FOREGROUND_RATE);
  });
});

describe("segmentWindow", () => {
  it("centres the first segment at p = 0 and the last at p = 1", () => {
    expect(segmentWindow(0, 6).start).toBeLessThanOrEqual(0);
    expect(segmentWindow(5, 6).end).toBeGreaterThanOrEqual(1);
  });

  it("gives adjacent segments touching windows", () => {
    expect(segmentWindow(1, 6).end).toBeCloseTo(segmentWindow(2, 6).start);
  });

  it("gives a lone segment the whole range", () => {
    expect(segmentWindow(0, 1)).toEqual({ start: 0, end: 1 });
  });
});

describe("labelOpacity", () => {
  it("is fully visible at its own segment's centre", () => {
    expect(labelOpacity(0, 0, 6)).toBe(1);
    expect(labelOpacity(0.2, 1, 6)).toBe(1);
    expect(labelOpacity(1, 5, 6)).toBe(1);
  });

  it("is invisible at the neighbouring segment's centre", () => {
    expect(labelOpacity(0.2, 0, 6)).toBe(0);
    expect(labelOpacity(0, 3, 6)).toBe(0);
  });

  it("crossfades in between, never leaving a gap where nothing is legible", () => {
    const midpoint = 0.1; // halfway between segment 0 and segment 1 of six
    expect(labelOpacity(midpoint, 0, 6) + labelOpacity(midpoint, 1, 6)).toBeGreaterThan(0.4);
  });

  it("always returns a value between 0 and 1", () => {
    for (let p = 0; p <= 1; p += 0.05) {
      for (let i = 0; i < 6; i++) {
        const value = labelOpacity(p, i, 6);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });

  it("keeps a lone label visible throughout", () => {
    expect(labelOpacity(0.5, 0, 1)).toBe(1);
  });
});

describe("lightPoolX", () => {
  it("is centred at the start", () => {
    expect(lightPoolX(0, 6)).toBeCloseTo(50);
  });

  it("stays inside the viewport", () => {
    for (let p = 0; p <= 1; p += 0.01) {
      expect(lightPoolX(p, 6)).toBeGreaterThan(20);
      expect(lightPoolX(p, 6)).toBeLessThan(80);
    }
  });

  it("never jumps, so the pool sweeps rather than snapping at each boundary", () => {
    // Sampled finely across the whole pan: no adjacent pair may differ by more
    // than a fraction of a viewport percent.
    let previous = lightPoolX(0, 6);
    for (let p = 0.001; p <= 1; p += 0.001) {
      const current = lightPoolX(p, 6);
      expect(Math.abs(current - previous)).toBeLessThan(1);
      previous = current;
    }
  });
});

describe("scrollDistanceVh", () => {
  it("reproduces the spec's desktop figure for six segments", () => {
    expect(scrollDistanceVh(6, "desktop")).toBe(500);
  });

  it("reproduces the spec's mobile figure for three segments", () => {
    expect(scrollDistanceVh(3, "mobile")).toBe(300);
  });

  it("never collapses to nothing", () => {
    expect(scrollDistanceVh(1, "desktop")).toBeGreaterThan(0);
    expect(scrollDistanceVh(0, "desktop")).toBeGreaterThan(0);
  });
});

describe("pinProgress", () => {
  it("is 0 before the section is reached", () => {
    expect(pinProgress(400, 5000, 900)).toBe(0);
  });

  it("is 1 once the section has been fully traversed", () => {
    expect(pinProgress(-(5000 - 900), 5000, 900)).toBe(1);
  });

  it("is halfway at the midpoint", () => {
    expect(pinProgress(-(5000 - 900) / 2, 5000, 900)).toBeCloseTo(0.5);
  });

  it("returns 0 when the section is shorter than the viewport", () => {
    expect(pinProgress(-100, 500, 900)).toBe(0);
  });
});

describe("approach", () => {
  it("moves toward the target without overshooting", () => {
    const next = approach(0, 1, 6, 1 / 60);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(1);
  });

  it("never moves away from the target, and settles on it", () => {
    let value = 0;
    let previous = 0;
    for (let i = 0; i < 400; i++) {
      value = approach(value, 1, 6, 1 / 60);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
    expect(value).toBe(1);
  });

  it("snaps to the target once the gap stops mattering", () => {
    expect(approach(0.99999, 1, 6, 1 / 60)).toBe(1);
  });

  it("runs at the same speed on 60Hz and 144Hz", () => {
    // A per-frame fraction would move ~2.4x faster on the faster display; this
    // is the property that stops the pan feeling different per monitor.
    let slow = 0;
    for (let i = 0; i < 60; i++) slow = approach(slow, 1, 6, 1 / 60);
    let fast = 0;
    for (let i = 0; i < 144; i++) fast = approach(fast, 1, 6, 1 / 144);
    expect(fast).toBeCloseTo(slow, 4);
  });

  it("works downward as well as upward", () => {
    expect(approach(1, 0, 6, 1 / 60)).toBeLessThan(1);
    expect(approach(1, 0, 6, 1 / 60)).toBeGreaterThan(0);
  });

  it("does nothing for a zero or negative frame time", () => {
    expect(approach(0.3, 1, 6, 0)).toBe(0.3);
    expect(approach(0.3, 1, 6, -0.5)).toBe(0.3);
  });
});

describe("objectPosition", () => {
  it("maps focalX to a percentage", () => {
    expect(objectPosition(0)).toBe("0% 50%");
    expect(objectPosition(0.5)).toBe("50% 50%");
    expect(objectPosition(1)).toBe("100% 50%");
  });

  it("clamps out-of-range values", () => {
    expect(objectPosition(-1)).toBe("0% 50%");
    expect(objectPosition(9)).toBe("100% 50%");
  });
});
