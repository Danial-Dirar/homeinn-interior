import { describe, expect, it } from "vitest";
import {
  approach, clamp01, driftX, lightPoolX, objectPosition, pinProgress, scrollDistanceVh,
  segmentOpacity, snapIndex, snappedProgress,
} from "./hero-math";

describe("clamp01", () => {
  it("clamps below and above", () => {
    expect(clamp01(-3)).toBe(0);
    expect(clamp01(4)).toBe(1);
    expect(clamp01(0.5)).toBe(0.5);
  });
});

describe("snapIndex", () => {
  it("maps the ends to the first and last room", () => {
    expect(snapIndex(0, 5)).toBe(0);
    expect(snapIndex(1, 5)).toBe(4);
  });

  it("rounds to the nearest room", () => {
    expect(snapIndex(0.24, 5)).toBe(1); // 0.24 * 4 = 0.96
    expect(snapIndex(0.26, 5)).toBe(1); // 1.04
    expect(snapIndex(0.4, 5)).toBe(2); // 1.6
  });

  it("never leaves the range, whatever it is given", () => {
    for (const p of [-5, -0.1, 1.1, 99]) {
      expect(snapIndex(p, 5)).toBeGreaterThanOrEqual(0);
      expect(snapIndex(p, 5)).toBeLessThanOrEqual(4);
    }
  });

  it("is 0 for a lone segment", () => {
    expect(snapIndex(0.7, 1)).toBe(0);
  });
});

describe("snappedProgress", () => {
  it("only ever lands on a whole room", () => {
    // This is the property the whole redesign exists for: the hero must never
    // come to rest showing half of one photograph and half of another.
    for (let p = 0; p <= 1; p += 0.017) {
      const snapped = snappedProgress(p, 5);
      expect(Number.isInteger(snapped * 4)).toBe(true);
    }
  });

  it("maps the ends exactly", () => {
    expect(snappedProgress(0, 5)).toBe(0);
    expect(snappedProgress(1, 5)).toBe(1);
  });
});

describe("segmentOpacity", () => {
  it("shows exactly one room at a resting position", () => {
    const p = snappedProgress(0.63, 5);
    const visible = [0, 1, 2, 3, 4].map((i) => segmentOpacity(p, i, 5));
    expect(visible.filter((o) => o === 1)).toHaveLength(1);
    expect(visible.filter((o) => o > 0)).toHaveLength(1);
  });

  it("crossfades a pair that always sums to one", () => {
    // Halfway between rooms 1 and 2 of five.
    const p = 1.5 / 4;
    expect(segmentOpacity(p, 1, 5) + segmentOpacity(p, 2, 5)).toBeCloseTo(1);
  });

  it("never lights a third room", () => {
    for (let p = 0; p <= 1; p += 0.01) {
      const lit = [0, 1, 2, 3, 4].filter((i) => segmentOpacity(p, i, 5) > 0);
      expect(lit.length).toBeLessThanOrEqual(2);
    }
  });

  it("stays within 0 and 1", () => {
    for (let p = 0; p <= 1; p += 0.05) {
      for (let i = 0; i < 5; i++) {
        expect(segmentOpacity(p, i, 5)).toBeGreaterThanOrEqual(0);
        expect(segmentOpacity(p, i, 5)).toBeLessThanOrEqual(1);
      }
    }
  });

  it("keeps a lone segment visible throughout", () => {
    expect(segmentOpacity(0.5, 0, 1)).toBe(1);
  });
});

describe("driftX", () => {
  it("is zero when the room is centred, so a resting frame is as composed", () => {
    expect(driftX(snappedProgress(0.5, 5), 2, 5)).toBe(0);
  });

  it("stays small enough never to expose the neighbouring photograph", () => {
    for (let p = 0; p <= 1; p += 0.01) {
      for (let i = 0; i < 5; i++) {
        expect(Math.abs(driftX(p, i, 5))).toBeLessThanOrEqual(4);
      }
    }
  });

  it("drifts the opposite way either side of centre", () => {
    expect(driftX(1.2 / 4, 1, 5)).toBeLessThan(0);
    expect(driftX(0.8 / 4, 1, 5)).toBeGreaterThan(0);
  });
});

describe("lightPoolX", () => {
  it("is centred at the start", () => {
    expect(lightPoolX(0, 5)).toBeCloseTo(50);
  });

  it("stays inside the viewport", () => {
    for (let p = 0; p <= 1; p += 0.01) {
      expect(lightPoolX(p, 5)).toBeGreaterThan(20);
      expect(lightPoolX(p, 5)).toBeLessThan(80);
    }
  });

  it("never jumps, so the pool sweeps rather than snapping", () => {
    let previous = lightPoolX(0, 5);
    for (let p = 0.001; p <= 1; p += 0.001) {
      const current = lightPoolX(p, 5);
      expect(Math.abs(current - previous)).toBeLessThan(1);
      previous = current;
    }
  });
});

describe("scrollDistanceVh", () => {
  it("gives one screenful of scroll per room", () => {
    expect(scrollDistanceVh(5, "desktop")).toBe(400);
    expect(scrollDistanceVh(6, "desktop")).toBe(500);
  });

  it("gives mobile more room per change of view", () => {
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

describe("approach", () => {
  it("moves toward the target without overshooting", () => {
    const next = approach(0, 1, 9, 1 / 60);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(1);
  });

  it("never moves away from the target, and settles on it", () => {
    let value = 0;
    let previous = 0;
    for (let i = 0; i < 400; i++) {
      value = approach(value, 1, 9, 1 / 60);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
    expect(value).toBe(1);
  });

  it("runs at the same speed on 60Hz and 144Hz", () => {
    let slow = 0;
    for (let i = 0; i < 60; i++) slow = approach(slow, 1, 9, 1 / 60);
    let fast = 0;
    for (let i = 0; i < 144; i++) fast = approach(fast, 1, 9, 1 / 144);
    expect(fast).toBeCloseTo(slow, 4);
  });

  it("does nothing for a zero or negative frame time", () => {
    expect(approach(0.3, 1, 9, 0)).toBe(0.3);
    expect(approach(0.3, 1, 9, -0.5)).toBe(0.3);
  });
});
