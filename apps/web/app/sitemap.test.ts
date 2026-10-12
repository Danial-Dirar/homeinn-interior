import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/content", () => ({
  getServices: async () => [{ slug: "interior-design" }],
  getProjects: async () => [{ slug: "brick-screen-villa" }],
  getBlogPosts: async () => [],
  getProducts: async () => [{ slug: "teak-armchair" }],
}));

import sitemap from "./sitemap";

describe("sitemap.xml", () => {
  it("lists the furniture catalogue and every published piece, in both languages", async () => {
    // The furniture pages went live without ever being added here.
    const urls = (await sitemap()).map((entry) => entry.url);
    for (const locale of ["en", "bn"]) {
      expect(urls).toContain(`http://localhost:3000/${locale}/furniture`);
      expect(urls).toContain(`http://localhost:3000/${locale}/furniture/teak-armchair`);
    }
  });

  it("still lists projects and services", async () => {
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls).toContain("http://localhost:3000/en/projects/brick-screen-villa");
    expect(urls).toContain("http://localhost:3000/bn/services/interior-design");
  });
});
