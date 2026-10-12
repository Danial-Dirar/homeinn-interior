import { describe, expect, it } from "vitest";
import robots from "./robots";
import { config } from "../middleware";
import nextConfig from "../next.config";

describe("robots.txt", () => {
  it("keeps the admin panel out of search engines, at both addresses", () => {
    const rules = robots().rules;
    const disallow = (Array.isArray(rules) ? rules[0] : rules)?.disallow;
    expect(disallow).toEqual(expect.arrayContaining(["/admins", "/admin"]));
  });
});

describe("the locale middleware", () => {
  const matches = (path: string) => config.matcher.some((m) => new RegExp(`^${m}$`).test(path));

  it("leaves the admin panel alone, so it is never sent to /en/admins", () => {
    expect(matches("/admins")).toBe(false);
    expect(matches("/admins/enquiries/abc")).toBe(false);
    expect(matches("/admin")).toBe(false);
  });

  it("still handles the public pages", () => {
    expect(matches("/")).toBe(true);
    expect(matches("/en/projects")).toBe(true);
    expect(matches("/administration-tips")).toBe(true);
  });
});

describe("the old admin address", () => {
  it("redirects to /admins", async () => {
    const redirects = await nextConfig.redirects?.();
    expect(redirects).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: "/admin", destination: "/admins" }),
      expect.objectContaining({ source: "/admin/:path*", destination: "/admins/:path*" }),
    ]));
  });
});
