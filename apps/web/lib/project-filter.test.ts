import { describe, expect, it } from "vitest";
import { areaFromSearchParams } from "./project-filter";

describe("areaFromSearchParams", () => {
  it("reads a single value", () => {
    expect(areaFromSearchParams({ area: "landscaping" })).toBe("landscaping");
  });

  it("takes the first when a param repeats", () => {
    expect(areaFromSearchParams({ area: ["landscaping", "gypsum-work"] })).toBe("landscaping");
  });

  it("returns undefined when absent, empty, or blank", () => {
    expect(areaFromSearchParams({})).toBeUndefined();
    expect(areaFromSearchParams({ area: "" })).toBeUndefined();
    expect(areaFromSearchParams({ area: "   " })).toBeUndefined();
  });

  it("ignores unrelated params", () => {
    expect(areaFromSearchParams({ page: "2" })).toBeUndefined();
  });
});
