import { describe, expect, it } from "vitest";
import { formatTaka } from "./money";

describe("formatTaka", () => {
  it("renders poisha as whole taka", () => {
    expect(formatTaka(7_800_000, "en")).toMatch(/78,000/);
  });

  it("carries a taka symbol", () => {
    expect(formatTaka(7_800_000, "en")).toMatch(/৳|BDT/);
  });

  it("uses Bangla numerals for bn", () => {
    expect(formatTaka(7_800_000, "bn")).toMatch(/[০-৯]/);
  });

  it("drops the paisa, which furniture is never priced in", () => {
    expect(formatTaka(7_800_000, "en")).not.toMatch(/\.00/);
  });

  it("rounds a stray paisa rather than showing a fraction", () => {
    expect(formatTaka(7_800_050, "en")).toMatch(/78,001|78,000/);
  });

  it("handles zero", () => {
    expect(formatTaka(0, "en")).toMatch(/0/);
  });
});
