import { describe, expect, it } from "vitest";
import { loginSchema, roleSchema } from "./auth.js";

describe("loginSchema", () => {
  it("accepts a valid credential pair", () => {
    expect(loginSchema.parse({ email: "a@b.com", password: "hunter22" }))
      .toEqual({ email: "a@b.com", password: "hunter22" });
  });
  it("lowercases and trims the email", () => {
    expect(loginSchema.parse({ email: "  A@B.COM ", password: "hunter22" }).email)
      .toBe("a@b.com");
  });
  it("rejects a malformed email", () => {
    expect(() => loginSchema.parse({ email: "nope", password: "hunter22" })).toThrow();
  });
  it("rejects a password shorter than 8 characters", () => {
    expect(() => loginSchema.parse({ email: "a@b.com", password: "short" })).toThrow();
  });
});

describe("roleSchema", () => {
  it("accepts ADMIN and EDITOR", () => {
    expect(roleSchema.parse("ADMIN")).toBe("ADMIN");
    expect(roleSchema.parse("EDITOR")).toBe("EDITOR");
  });
  it("rejects an unknown role", () => {
    expect(() => roleSchema.parse("SUPERUSER")).toThrow();
  });
});
