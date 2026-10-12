import { trustProxySetting } from "./trust-proxy";

describe("trustProxySetting", () => {
  it("trusts the loopback proxy by default, which a local tunnel connects from", () => {
    expect(trustProxySetting(undefined)).toBe("loopback");
  });

  it("reads numbers and booleans as Express means them, instead of crashing at start-up", () => {
    // Express takes 1 as "one hop" but "1" as an IP address, and throws.
    expect(trustProxySetting("1")).toBe(1);
    expect(trustProxySetting("true")).toBe(true);
    expect(trustProxySetting("false")).toBe(false);
  });

  it("passes names and address lists through", () => {
    expect(trustProxySetting("loopback, 10.0.0.0/8")).toBe("loopback, 10.0.0.0/8");
  });
});
