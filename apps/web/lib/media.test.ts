import { describe, expect, it } from "vitest";
import { blurhashAverageColor, largestSrc, PLACEHOLDER_COLOR } from "./media";

const B83 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~";

/** The test writes its own base83 encoder so the expectation is independent. */
function encode83(value: number, length: number): string {
  let out = "";
  for (let i = 1; i <= length; i++) {
    const digit = Math.floor(value / 83 ** (length - i)) % 83;
    out += B83[digit];
  }
  return out;
}

const hashFor = (rgb: number): string => `L${B83[9]}${encode83(rgb, 4)}${"0".repeat(23)}`;

describe("largestSrc", () => {
  it("returns the URL of the widest candidate", () => {
    expect(largestSrc("http://cdn/a/480.webp 480w, http://cdn/a/1920.webp 1920w"))
      .toBe("http://cdn/a/1920.webp");
  });

  it("does not assume the candidates are sorted", () => {
    expect(largestSrc("http://cdn/a/1920.webp 1920w, http://cdn/a/480.webp 480w"))
      .toBe("http://cdn/a/1920.webp");
  });

  it("returns an empty string for an empty srcset", () => {
    expect(largestSrc("")).toBe("");
  });
});

describe("blurhashAverageColor", () => {
  it("decodes the DC component to a hex colour", () => {
    expect(blurhashAverageColor(hashFor(0x336699))).toBe("#336699");
  });

  it("pads short channel values", () => {
    expect(blurhashAverageColor(hashFor(0x000102))).toBe("#000102");
  });

  it("falls back for a missing hash", () => {
    expect(blurhashAverageColor(null)).toBe(PLACEHOLDER_COLOR);
    expect(blurhashAverageColor(undefined)).toBe(PLACEHOLDER_COLOR);
  });

  it("falls back for a malformed hash rather than throwing", () => {
    expect(blurhashAverageColor("!!")).toBe(PLACEHOLDER_COLOR);
    expect(blurhashAverageColor("L««««000000000000000000000000")).toBe(PLACEHOLDER_COLOR);
  });
});
