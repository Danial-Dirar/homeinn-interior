import { describe, expect, it } from "vitest";
import { createLeadSchema } from "./lead.js";

const base = { type: "CONTACT" as const, name: "Rahim", phone: "01760775454", locale: "bn" as const };

describe("createLeadSchema", () => {
  it("accepts a local-format Bangladeshi mobile number", () => {
    expect(createLeadSchema.parse(base).phone).toBe("01760775454");
  });

  it("normalises +880 and 880 prefixes to the local 01… form", () => {
    expect(createLeadSchema.parse({ ...base, phone: "+8801760775454" }).phone).toBe("01760775454");
    expect(createLeadSchema.parse({ ...base, phone: "8801760775454" }).phone).toBe("01760775454");
  });

  it("strips spaces and dashes before validating", () => {
    expect(createLeadSchema.parse({ ...base, phone: "01760-775 454" }).phone).toBe("01760775454");
  });

  it("rejects a number that is not a Bangladeshi mobile", () => {
    expect(() => createLeadSchema.parse({ ...base, phone: "12345" })).toThrow();
    expect(() => createLeadSchema.parse({ ...base, phone: "01160775454" })).toThrow();
  });

  it("requires a name", () => {
    expect(() => createLeadSchema.parse({ ...base, name: "" })).toThrow();
  });

  it("allows an omitted email but rejects a malformed one", () => {
    expect(createLeadSchema.parse(base).email).toBeUndefined();
    expect(() => createLeadSchema.parse({ ...base, email: "nope" })).toThrow();
  });

  it("rejects an unknown lead type", () => {
    expect(() => createLeadSchema.parse({ ...base, type: "SPAM" })).toThrow();
  });
});
