import { slugify, uniqueSlug } from "./slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Home Furniture Supply")).toBe("home-furniture-supply");
  });
  it("strips punctuation", () => {
    expect(slugify("2D Plan & Solution")).toBe("2d-plan-solution");
  });
  it("collapses repeated separators", () => {
    expect(slugify("Resort,  Eco-Resort  &  Hotel")).toBe("resort-eco-resort-hotel");
  });
  it("trims leading and trailing hyphens", () => {
    expect(slugify("  --Gypsum Work--  ")).toBe("gypsum-work");
  });
  it("returns a fallback for input with no ascii word characters", () => {
    expect(slugify("বসার ঘর")).toBe("item");
  });
});

describe("uniqueSlug", () => {
  it("returns the base when it is free", async () => {
    expect(await uniqueSlug("living-room", async () => false)).toBe("living-room");
  });
  it("appends a counter until free", async () => {
    const taken = new Set(["living-room", "living-room-2"]);
    expect(await uniqueSlug("living-room", async (s) => taken.has(s))).toBe("living-room-3");
  });
});
