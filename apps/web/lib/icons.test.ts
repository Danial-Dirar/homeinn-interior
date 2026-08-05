import { Sofa } from "lucide-react";
import { describe, expect, it } from "vitest";
import { iconFor } from "./icons";

describe("iconFor", () => {
  it("maps every icon name the seed uses", () => {
    // apps/api/prisma/seed-data/services.ts — these seven, exactly.
    // lucide icons are forwardRef components, so they are objects, not functions.
    for (const name of ["sofa", "paintbrush", "building", "ruler", "box", "blinds", "cooking-pot"]) {
      expect(iconFor(name)).toBeDefined();
      expect(iconFor(name)).not.toBe(iconFor("not-a-real-icon"));
    }
  });

  it("resolves a known name to its icon", () => {
    expect(iconFor("sofa")).toBe(Sofa);
  });

  it("falls back rather than crashing on an unknown name", () => {
    expect(iconFor("not-a-real-icon")).toBeDefined();
  });
});
