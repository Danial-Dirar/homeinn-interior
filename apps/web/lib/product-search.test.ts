import { describe, expect, it } from "vitest";
import type { ProductView } from "./api.types";
import { EMPTY_QUERY, filterProducts } from "./product-search";

function product(over: Partial<ProductView>): ProductView {
  return {
    id: over.slug ?? "p", slug: over.slug ?? "p",
    nameEn: "Carved Wooden Wardrobe", nameBn: "কারুকাজ করা কাঠের আলমারি",
    summaryEn: "Three-door wardrobe in solid wood.", summaryBn: "নিরেট কাঠের তিন-দরজার আলমারি।",
    descriptionEn: "", descriptionBn: "",
    priceBdt: 7_800_000, madeToOrder: true, leadTimeDays: 21,
    sortOrder: 0, featured: false, cover: null,
    ...over,
  };
}

const wardrobe = product({ slug: "wardrobe" });
const desk = product({
  slug: "desk", nameEn: "Executive Desk", nameBn: "এক্সিকিউটিভ ডেস্ক",
  summaryEn: "Wide veneered top.", summaryBn: "চওড়া ভিনিয়ার টপ।",
  priceBdt: 9_600_000,
});
const shelving = product({
  slug: "shelving", nameEn: "Steel Display Shelving", nameBn: "স্টিলের ডিসপ্লে শেলভিং",
  summaryEn: "Powder-coated steel frame.", summaryBn: "পাউডার-কোটেড স্টিল ফ্রেম।",
  priceBdt: null,
});
const all = [wardrobe, desk, shelving];

describe("filterProducts", () => {
  it("returns everything for an empty query", () => {
    expect(filterProducts(all, EMPTY_QUERY, "en")).toHaveLength(3);
  });

  it("matches on the name", () => {
    expect(filterProducts(all, { ...EMPTY_QUERY, text: "desk" }, "en")).toEqual([desk]);
  });

  it("matches on the summary too", () => {
    expect(filterProducts(all, { ...EMPTY_QUERY, text: "veneered" }, "en")).toEqual([desk]);
  });

  it("ignores case", () => {
    expect(filterProducts(all, { ...EMPTY_QUERY, text: "EXECUTIVE" }, "en")).toEqual([desk]);
  });

  it("narrows with each word rather than widening", () => {
    // "steel shelving" must not also return the wooden wardrobe.
    expect(filterProducts(all, { ...EMPTY_QUERY, text: "steel shelving" }, "en"))
      .toEqual([shelving]);
  });

  it("searches the reader's own language", () => {
    // A Bangla visitor types Bangla; searching the English fields would fail.
    expect(filterProducts(all, { ...EMPTY_QUERY, text: "আলমারি" }, "bn")).toEqual([wardrobe]);
    expect(filterProducts(all, { ...EMPTY_QUERY, text: "আলমারি" }, "en")).toEqual([]);
  });

  it("filters by price band", () => {
    expect(filterProducts(all, { ...EMPTY_QUERY, band: "50kTo1lakh" }, "en"))
      .toEqual([wardrobe, desk]);
    expect(filterProducts(all, { ...EMPTY_QUERY, band: "under50k" }, "en")).toEqual([]);
  });

  it("excludes a quote-only piece from any price band", () => {
    // It has no figure; calling it cheap or dear would both be wrong.
    for (const band of ["under50k", "50kTo1lakh", "over1lakh"] as const) {
      expect(filterProducts(all, { ...EMPTY_QUERY, band }, "en")).not.toContain(shelving);
    }
    expect(filterProducts(all, { ...EMPTY_QUERY, band: "any" }, "en")).toContain(shelving);
  });

  it("combines text and price", () => {
    expect(filterProducts(all, { ...EMPTY_QUERY, text: "desk", band: "under50k" }, "en"))
      .toEqual([]);
  });

  it("filters to made-to-order pieces", () => {
    const stocked = product({ slug: "stocked", madeToOrder: false });
    expect(filterProducts([...all, stocked], { ...EMPTY_QUERY, madeToOrderOnly: true }, "en"))
      .not.toContain(stocked);
  });

  it("ignores stray whitespace", () => {
    expect(filterProducts(all, { ...EMPTY_QUERY, text: "  desk  " }, "en")).toEqual([desk]);
  });
});
