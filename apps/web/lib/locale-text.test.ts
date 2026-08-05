import { describe, expect, it } from "vitest";
import { text, textOrNull } from "./locale-text";

const row = {
  titleEn: "Living Room", titleBn: "বসার ঘর",
  captionEn: null, captionBn: "ক্যাপশন",
};

describe("text", () => {
  it("returns the English field for en", () => {
    expect(text(row, "title", "en")).toBe("Living Room");
  });

  it("returns the Bangla field for bn", () => {
    expect(text(row, "title", "bn")).toBe("বসার ঘর");
  });

  it("never falls back across languages", () => {
    // Spec §9: a bn page showing English is the failure this design prevents.
    // The API's bilingualText schema guarantees both columns are non-empty, so
    // an empty Bangla string is a data bug that must stay visible, not be masked.
    expect(text({ titleEn: "Only English", titleBn: "" }, "title", "bn")).toBe("");
  });
});

describe("textOrNull", () => {
  it("passes nulls through", () => {
    expect(textOrNull(row, "caption", "en")).toBeNull();
    expect(textOrNull(row, "caption", "bn")).toBe("ক্যাপশন");
  });
});
