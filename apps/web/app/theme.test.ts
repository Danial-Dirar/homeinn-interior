import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(__dirname, "globals.css"), "utf8");

describe("the §8 palette", () => {
  const palette = {
    ink: "#0B0B0C", "ink-raised": "#141416", "ink-line": "#232326",
    bone: "#F6F2EC", sand: "#E7DFD2", "sand-dim": "#9C948A",
    walnut: "#7A5537", amber: "#C9A227", brand: "#E01B24",
  };

  for (const [token, value] of Object.entries(palette)) {
    it(`defines ${token} as ${value}`, () => {
      expect(css).toContain(`--color-${token}: ${value}`);
    });
  }

  it("scales Bangla headings to 0.94 of the Latin size", () => {
    expect(css).toMatch(/html\[lang="bn"\][^}]*--type-scale:\s*0\.94/);
  });
});
