import { describe, expect, it } from "vitest";
import { fontClassFor } from "./typography";

describe("fontClassFor", () => {
  it("uses the Latin stack for English", () => {
    expect(fontClassFor("en")).toBe("font-sans");
  });

  it("uses the Bangla stack for Bangla", () => {
    // Spec §9: the Bangla font must come from the server, so no flash of Latin.
    expect(fontClassFor("bn")).toBe("font-bangla");
  });
});
