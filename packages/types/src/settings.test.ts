import { describe, expect, it } from "vitest";
import { updateSettingsSchema } from "./settings.js";

describe("updateSettingsSchema", () => {
  it("allows no WhatsApp on the first line, as the company answers WhatsApp only on the second", () => {
    expect(updateSettingsSchema.parse({ whatsapp: "" }).whatsapp).toBe("");
  });

  it("accepts only web addresses for social links, and clears one with an empty string", () => {
    expect(updateSettingsSchema.parse({ facebookUrl: "https://facebook.com/homeinn" }).facebookUrl)
      .toBe("https://facebook.com/homeinn");
    expect(updateSettingsSchema.parse({ facebookUrl: "" }).facebookUrl).toBeNull();
    expect(() => updateSettingsSchema.parse({ facebookUrl: "javascript:alert(1)" })).toThrow();
  });
});
