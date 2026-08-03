import { describe, expect, it } from "vitest";
import { paginationQuerySchema, bilingualText, localeSchema } from "./common.js";

describe("localeSchema", () => {
  it("accepts en and bn", () => {
    expect(localeSchema.parse("en")).toBe("en");
    expect(localeSchema.parse("bn")).toBe("bn");
  });
  it("rejects anything else", () => {
    expect(() => localeSchema.parse("hi")).toThrow();
  });
});

describe("paginationQuerySchema", () => {
  it("defaults to page 1, perPage 20", () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, perPage: 20 });
  });
  it("coerces numeric strings from query params", () => {
    expect(paginationQuerySchema.parse({ page: "3", perPage: "50" }))
      .toEqual({ page: 3, perPage: 50 });
  });
  it("caps perPage at 100", () => {
    expect(() => paginationQuerySchema.parse({ perPage: 101 })).toThrow();
  });
});

describe("bilingualText", () => {
  const schema = bilingualText("title");
  it("requires both languages to be non-empty", () => {
    expect(schema.parse({ titleEn: "Living Room", titleBn: "বসার ঘর" }))
      .toEqual({ titleEn: "Living Room", titleBn: "বসার ঘর" });
  });
  it("rejects an empty bangla field", () => {
    expect(() => schema.parse({ titleEn: "Living Room", titleBn: "" })).toThrow();
  });
  it("rejects a missing bangla field", () => {
    expect(() => schema.parse({ titleEn: "Living Room" })).toThrow();
  });
});
