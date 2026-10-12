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
