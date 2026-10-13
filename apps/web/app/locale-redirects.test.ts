// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import middleware from "../middleware";

function visit(path: string, language = "en-US,en;q=0.9") {
  // What the server sees behind the proxy: its own loopback address as the URL.
  return middleware(new NextRequest(`http://localhost:3200${path}`, {
    headers: { host: "homeinn.xyz", "accept-language": language },
  }));
}

describe("the locale middleware's redirects", () => {
  it("send visitors to a path on the address they came to, never to the server's own", async () => {
    // Next built the redirect from its loopback address, so visitors to
    // https://homeinn.xyz/ were sent to https://localhost:3200/en.
    const response = await visit("/");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("/en");
  });

  it("keep the language a Bangla browser asks for", async () => {
    expect((await visit("/", "bn-BD,bn;q=0.9")).headers.get("location")).toBe("/bn");
  });

  it("keep the query string", async () => {
    expect((await visit("/projects?area=residential")).headers.get("location")).toBe("/en/projects?area=residential");
  });

  it("leave the hreflang alternates to the page metadata, which knows the public https address", async () => {
    // next-intl's own Link header was built from the proxied request: http,
    // not https. Every page already declares its alternates in <head>.
    expect((await visit("/en")).headers.get("link")).toBeNull();
  });
});
