import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiGet, apiGetOr, apiGetOrNull } from "./api";

function stubFetch(status: number, body: unknown) {
  const spy = vi.fn(async (...args: unknown[]) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    args,
  }));
  vi.stubGlobal("fetch", spy);
  return spy;
}

afterEach(() => vi.unstubAllGlobals());

describe("apiGet", () => {
  it("requests the path against the configured base", async () => {
    const spy = stubFetch(200, { ok: true });
    await apiGet("/services");
    expect(spy.mock.calls[0]?.[0]).toBe("http://localhost:4000/api/services");
  });

  it("returns the parsed body", async () => {
    stubFetch(200, [{ slug: "a" }]);
    await expect(apiGet("/services")).resolves.toEqual([{ slug: "a" }]);
  });

  it("throws an ApiError carrying the status", async () => {
    stubFetch(500, {});
    await expect(apiGet("/services")).rejects.toBeInstanceOf(ApiError);
    await expect(apiGet("/services")).rejects.toMatchObject({ status: 500 });
  });
});

describe("apiGetOrNull", () => {
  it("turns a 404 into null", async () => {
    stubFetch(404, {});
    await expect(apiGetOrNull("/services/nope")).resolves.toBeNull();
  });

  it("still throws on a 500 — a broken API is not a missing page", async () => {
    stubFetch(500, {});
    await expect(apiGetOrNull("/services/x")).rejects.toBeInstanceOf(ApiError);
  });
});

describe("apiGetOr", () => {
  it("returns the fallback when the call fails", async () => {
    stubFetch(503, {});
    await expect(apiGetOr("/testimonials", [])).resolves.toEqual([]);
  });
});
