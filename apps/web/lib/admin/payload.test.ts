import { describe, expect, it } from "vitest";
import type { Field } from "./fields";
import { initialValues, toPayload, validate } from "./payload";

const image = (id: string) => ({ id, sources: [], altEn: "a", altBn: "b", width: 1, height: 1 }) as never;

const fields: Field[] = [
  { name: "title", label: "Title", kind: "text", bilingual: true, required: true },
  { name: "location", label: "Location", kind: "text", bilingual: true },
  { name: "clientName", label: "Client", kind: "text", nullable: true },
  { name: "year", label: "Year", kind: "number", nullable: true, min: 1990, max: 2100 },
  { name: "sortOrder", label: "Order", kind: "number", defaultValue: 0 },
  { name: "priceBdt", label: "Price", kind: "money" },
  { name: "published", label: "Published", kind: "boolean" },
  { name: "cover", key: "coverId", label: "Cover", kind: "media", nullable: true },
  { name: "gallery", key: "galleryIds", label: "Gallery", kind: "gallery" },
  { name: "tags", label: "Tags", kind: "tags" },
  { name: "publishedAt", label: "Date", kind: "date", nullable: true },
  { name: "workingAreaId", label: "Area", kind: "relation", resource: "working-areas", optionLabel: () => "", required: true },
];

describe("toPayload", () => {
  it("sends bilingual text as En/Bn pairs, trimmed", () => {
    const payload = toPayload(fields, { ...initialValues(fields), titleEn: "  Villa ", titleBn: "ভিলা" });
    expect(payload).toMatchObject({ titleEn: "Villa", titleBn: "ভিলা" });
  });

  it("clears an empty nullable field with null, and keeps a non-nullable one as an empty string", () => {
    // A project's location may be empty (""), but a cleared client name is gone (null).
    const payload = toPayload(fields, initialValues(fields));
    expect(payload).toMatchObject({ clientName: null, locationEn: "", locationBn: "", year: null, coverId: null });
  });

  it("falls back to a number field's default when it is left empty", () => {
    expect(toPayload(fields, initialValues(fields)).sortOrder).toBe(0);
  });

  it("enters money in taka and sends poisha, or null for price on request", () => {
    expect(toPayload(fields, { ...initialValues(fields), priceBdt: "24500" }).priceBdt).toBe(2_450_000);
    expect(toPayload(fields, { ...initialValues(fields), priceBdt: "12.5" }).priceBdt).toBe(1250);
    expect(toPayload(fields, initialValues(fields)).priceBdt).toBeNull();
  });

  it("sends an image as its id and a gallery as an ordered list of ids", () => {
    const payload = toPayload(fields, { ...initialValues(fields), cover: image("c1"), gallery: [image("g2"), image("g1")] });
    expect(payload).toMatchObject({ coverId: "c1", galleryIds: ["g2", "g1"] });
    expect(payload).not.toHaveProperty("cover");
    expect(payload).not.toHaveProperty("gallery");
  });

  it("splits tags on commas and drops the empty ones", () => {
    expect(toPayload(fields, { ...initialValues(fields), tags: "teak, dhaka ,, " }).tags).toEqual(["teak", "dhaka"]);
  });
});

describe("initialValues", () => {
  it("reads a saved row back into the form", () => {
    const values = initialValues(fields, {
      id: "p1", titleEn: "Villa", titleBn: "ভিলা", locationEn: null, year: 2024, priceBdt: 2_450_000,
      published: true, cover: image("c1"), gallery: [image("g1")], tags: ["a", "b"],
      publishedAt: "2026-10-13T08:00:00.000Z", workingAreaId: "w1",
    });
    expect(values).toMatchObject({
      titleEn: "Villa", titleBn: "ভিলা", locationEn: "", year: "2024", priceBdt: "24500",
      published: true, tags: "a, b", publishedAt: "2026-10-13", workingAreaId: "w1",
    });
    expect((values.cover as { id: string }).id).toBe("c1");
    expect(values.gallery).toHaveLength(1);
  });

  it("starts a new row from each field's default", () => {
    expect(initialValues(fields)).toMatchObject({ sortOrder: "0", published: false, cover: null, gallery: [] });
  });
});

describe("validate", () => {
  it("asks for both languages of a required field", () => {
    const errors = validate(fields, { ...initialValues(fields), titleEn: "Villa", workingAreaId: "w1" });
    expect(errors).toEqual({ titleBn: "Required" });
  });

  it("keeps numbers inside their range", () => {
    const errors = validate(fields, {
      ...initialValues(fields), titleEn: "a", titleBn: "b", workingAreaId: "w1", year: "1850",
    });
    expect(errors.year).toBe("Must be 1990 or more");
  });

  it("refuses a price that is not a number", () => {
    const errors = validate(fields, {
      ...initialValues(fields), titleEn: "a", titleBn: "b", workingAreaId: "w1", priceBdt: "a lot",
    });
    expect(errors.priceBdt).toBe("Enter an amount in taka, or leave it empty");
  });

  it("asks for a required choice", () => {
    expect(validate(fields, { ...initialValues(fields), titleEn: "a", titleBn: "b" }).workingAreaId).toBe("Required");
  });
});
