import { describe, expect, it } from "vitest";
import { apiBaseUrl, siteUrl } from "./env";

describe("apiBaseUrl", () => {
  it("defaults to the local API", () => {
    expect(apiBaseUrl({})).toBe("http://localhost:4000/api");
  });

  it("reads NEXT_PUBLIC_API_URL", () => {
    expect(apiBaseUrl({ NEXT_PUBLIC_API_URL: "https://api.homeinn-interior.com/api" }))
      .toBe("https://api.homeinn-interior.com/api");
  });

  it("strips trailing slashes so path joins never double up", () => {
    expect(apiBaseUrl({ NEXT_PUBLIC_API_URL: "https://api.homeinn-interior.com/api//" }))
      .toBe("https://api.homeinn-interior.com/api");
  });
});

describe("siteUrl", () => {
  it("defaults to the local dev origin", () => {
    expect(siteUrl({})).toBe("http://localhost:3000");
  });

  it("strips a trailing slash", () => {
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: "https://homeinn-interior.com/" }))
      .toBe("https://homeinn-interior.com");
  });
});
