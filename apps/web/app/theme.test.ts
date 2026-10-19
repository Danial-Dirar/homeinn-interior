import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(__dirname, "globals.css"), "utf8");

describe("the palette", () => {
  // Taken from the cream Home Inn logo (assets/): charcoal, cream and burnt
  // orange. The amber of the dark cover was dropped at Muhammad's call.
  // `brand` is the logo's orange deepened to pass AA as small text on cream
  // (4.73:1); `ember` is it lifted to pass on charcoal (5.11:1); `logo` is the
  // exact orange of the mark, used for the "inn" of the wordmark only.
  const palette = {
    ink: "#14181A", "ink-raised": "#1D2225", "ink-line": "#2B3135",
    bone: "#F3EDE2", sand: "#E7DFD2", "sand-dim": "#9C948A",
    walnut: "#7A5537", brand: "#AE4B0B", ember: "#D86A27", logo: "#B9500C",
  };

  for (const [token, value] of Object.entries(palette)) {
    it(`defines ${token} as ${value}`, () => {
      expect(css).toContain(`--color-${token}: ${value}`);
    });
  }

  it("has no trace of the retired red or the dropped amber", () => {
    expect(css).not.toMatch(/#E01B24/i);
    expect(css).not.toMatch(/#F0A63A/i);
    expect(css).not.toMatch(/--color-amber/);
  });

  it("accents in brand on light grounds and ember on dark ones", () => {
    // Brand is 3.24:1 on charcoal and ember 3.00:1 on cream, so neither works
    // on both. Dark grounds opt in with `.ground-ink`.
    expect(css).toMatch(/--color-accent:\s*var\(--color-brand\)/);
    expect(css).toMatch(/\.ground-ink\s*\{[^}]*--color-accent:\s*var\(--color-ember\)/);
  });
});

describe("the light theme", () => {
  const flip = /\[data-theme="light"\] \.ground-ink:not\(\.ground-photo\)\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";

  it("turns every dark ground to paper, swapping ground and text", () => {
    // Components say bg-ink / text-sand; flipping the tokens on the ground
    // flips the whole subtree without touching a component.
    expect(flip).toMatch(/--color-ink:\s*#F8F4EC/);
    expect(flip).toMatch(/--color-sand:\s*#14181A/);
    expect(flip).toMatch(/--color-bone:\s*#14181A/);
    expect(flip).toMatch(/--color-accent:\s*var\(--color-brand\)/);
  });

  it("leaves photographs dark, because their captions sit on a dark floor", () => {
    expect(css).toMatch(/\.ground-ink:not\(\.ground-photo\)/);
  });

  it("puts the header on the logo's own cream", () => {
    expect(css).toMatch(/\[data-theme="light"\] \.ground-chrome\s*\{[^}]*--color-ink:\s*#F3EDE2/);
  });
});

describe("a furniture piece's second view", () => {
  it("takes turns with the cover on touch screens, which cannot hover", () => {
    expect(css).toMatch(/@media \(hover: none\) and \(prefers-reduced-motion: no-preference\)\s*\{\s*\[data-second-view\]\s*\{[^}]*animation:\s*second-view/);
    expect(css).toMatch(/@keyframes second-view/);
  });
});

describe("the dark: variant", () => {
  it("follows the lamp in the header, not the operating system", () => {
    // Tailwind's own dark: reads prefers-color-scheme, which would disagree
    // with the switch whenever a visitor's system and choice differ.
    expect(css).toContain('@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));');
  });
});

describe("the dark theme", () => {
  // Lights off should mean a dark screen. The cream grounds stayed cream, so
  // most of every page was still lit; now they go dark too.
  const root = /\[data-theme="dark"\]\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
  const keep = /\[data-theme="dark"\] \.ground-ink\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
  const token = (block: string, name: string) =>
    new RegExp(`--color-${name}:\\s*(#[0-9A-Fa-f]{6})`).exec(block)?.[1] ?? "";

  function luminance(hex: string): number {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  }
  const contrast = (a: string, b: string) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi! + 0.05) / (lo! + 0.05);
  };
  /** A colour at `alpha` over a ground, as the eye sees it. */
  function over(hex: string, alpha: number, ground: string): string {
    const mix = [1, 3, 5].map((i) =>
      Math.round(parseInt(hex.slice(i, i + 2), 16) * alpha + parseInt(ground.slice(i, i + 2), 16) * (1 - alpha)));
    return `#${mix.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  }

  it("turns the cream grounds dark, and their charcoal text light", () => {
    expect(luminance(token(root, "bone"))).toBeLessThan(0.03);
    expect(luminance(token(root, "ink"))).toBeGreaterThan(0.6);
    expect(root).toMatch(/--color-accent:\s*var\(--color-ember\)/);
    expect(root).toMatch(/color-scheme:\s*dark/);
  });

  it("keeps body text, muted text and the accent readable on the dark ground", () => {
    const ground = token(root, "bone");
    const text = token(root, "ink");
    expect(contrast(text, ground)).toBeGreaterThan(7);
    expect(contrast(over(text, 0.65, ground), ground)).toBeGreaterThan(4.5);
    expect(contrast("#D86A27", ground)).toBeGreaterThan(4.5);
    expect(contrast(token(root, "walnut"), ground)).toBeGreaterThan(3);
  });

  it("leaves the dark grounds as they were: the hero, the header and the footer", () => {
    expect(token(keep, "ink")).toBe("#14181A");
    expect(token(keep, "bone")).toBe("#F3EDE2");
    expect(token(keep, "sand")).toBe("#E7DFD2");
  });
});

describe("type", () => {
  it("sets headings in Righteous, the logo's face, with Bangla falling back to Anek", () => {
    // Righteous has no Bangla glyphs; without Anek in the same stack a bn
    // heading would drop to whatever system font the browser finds.
    expect(css).toMatch(/--font-display:\s*var\(--font-amp\),\s*var\(--font-righteous\),\s*var\(--font-anek\)/);
  });

  it("borrows only the ampersand from another face", () => {
    // Righteous's own & reads as a € — "Office € Bank Furniture". The amp face
    // is restricted to U+0026, so it can never take over any other character.
    const fonts = readFileSync(join(__dirname, "../lib/fonts.ts"), "utf8");
    expect(fonts).toMatch(/unicode-range["']?,\s*value:\s*["']U\+0026["']/);
  });

  it("never mutes body text below 65%, which is AA on the cream ground", () => {
    // The logo's cream is a shade deeper than the old bone, and ink at 60%
    // on it measures 4.44:1 — just under AA. At 65% it is 5.21:1.
    const tsx = readdirSync(join(__dirname, ".."), { recursive: true, encoding: "utf8" })
      .filter((file) => /^(app|components)\/.*\.tsx$/.test(file) && !file.includes(".test."));
    const offenders = tsx.filter((file) =>
      /\btext-(ink|current)\/(50|55|60)\b/.test(readFileSync(join(__dirname, "..", file), "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("scales Bangla headings to 0.94 of the Latin size", () => {
    expect(css).toMatch(/html\[lang="bn"\][^}]*--type-scale:\s*0\.94/);
  });
});
