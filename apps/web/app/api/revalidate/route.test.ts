import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const revalidateTag = vi.fn();
vi.mock("next/cache", () => ({ revalidateTag: (tag: string) => revalidateTag(tag) }));

import { POST } from "./route";

function call(body: unknown, secret?: string) {
  return POST(new Request("http://web/api/revalidate", {
    method: "POST",
    headers: { "content-type": "application/json", ...(secret ? { "x-revalidate-secret": secret } : {}) },
    body: JSON.stringify(body),
  }));
}

beforeEach(() => {
  process.env.REVALIDATE_SECRET = "s3cret-value";
  revalidateTag.mockClear();
});
afterEach(() => {
  delete process.env.REVALIDATE_SECRET;
});

describe("POST /api/revalidate", () => {
  it("refreshes the pages that carry each tag the API names", async () => {
    const res = await call({ tags: ["projects", "hero"] }, "s3cret-value");
    expect(res.status).toBe(200);
    expect(revalidateTag.mock.calls.map(([tag]) => tag)).toEqual(["projects", "hero"]);
  });

  it("refuses a wrong or missing secret", async () => {
    expect((await call({ tags: ["projects"] }, "guess")).status).toBe(401);
    expect((await call({ tags: ["projects"] })).status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("is closed entirely when no secret is configured", async () => {
    delete process.env.REVALIDATE_SECRET;
    expect((await call({ tags: ["projects"] }, "")).status).toBe(401);
  });

  it("ignores tags no page uses", async () => {
    await call({ tags: ["projects", "../../etc", "everything"] }, "s3cret-value");
    expect(revalidateTag.mock.calls.map(([tag]) => tag)).toEqual(["projects"]);
  });
});
