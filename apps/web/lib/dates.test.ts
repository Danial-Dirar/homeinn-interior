import { describe, expect, it } from "vitest";
import { formatDate } from "./dates";

describe("formatDate", () => {
  it("formats an ISO date in English", () => {
    expect(formatDate("2026-03-14T00:00:00.000Z", "en")).toBe("14 March 2026");
  });

  it("formats in Bangla with Bangla numerals", () => {
    expect(formatDate("2026-03-14T00:00:00.000Z", "bn")).toMatch(/[০-৯]/);
  });

  it("returns an empty string for a missing date rather than Invalid Date", () => {
    expect(formatDate(null, "en")).toBe("");
  });

  it("returns an empty string for an unparseable value", () => {
    expect(formatDate("not-a-date", "en")).toBe("");
  });
});
