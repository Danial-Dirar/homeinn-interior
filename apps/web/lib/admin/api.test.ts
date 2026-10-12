import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adminFetch, adminSend, AdminApiError, loginPathFor } from "./api";

type Reply = { status: number; body?: unknown };

/** A fake API: queued replies per path, recording every call. */
function fakeApi(routes: Record<string, Reply[]>) {
  const calls: string[] = [];
  const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
    const path = input.replace(/^https?:\/\/[^/]+\/api/, "");
    calls.push(`${init?.method ?? "GET"} ${path}`);
    const queue = routes[path] ?? [];
    const reply = queue.length > 1 ? queue.shift()! : queue[0] ?? { status: 404 };
    return new Response(reply.body === undefined ? null : JSON.stringify(reply.body), { status: reply.status });
  });
  vi.stubGlobal("fetch", fetchMock);
  return { calls, fetchMock };
}

const assign = vi.fn();

beforeEach(() => {
  assign.mockClear();
  vi.stubGlobal("location", { pathname: "/admins/enquiries", search: "?status=NEW", assign });
});
afterEach(() => vi.unstubAllGlobals());

describe("adminFetch", () => {
  it("always sends the session cookies", async () => {
    const { fetchMock } = fakeApi({ "/leads": [{ status: 200, body: [] }] });
    await adminFetch("/leads");
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({ credentials: "include" });
  });

  it("refreshes once on a 401 and retries the request", async () => {
    const { calls } = fakeApi({
      "/leads": [{ status: 401 }, { status: 200, body: { items: [] } }],
      "/auth/refresh": [{ status: 200, body: { ok: true } }],
    });
    const res = await adminFetch("/leads");
    expect(res.status).toBe(200);
    expect(calls).toEqual(["GET /leads", "POST /auth/refresh", "GET /leads"]);
  });

  it("shares one refresh between requests that fail together", async () => {
    // Rotation invalidates the previous refresh token: six parallel refreshes
    // would race, and every loser would sign the user out.
    const { calls } = fakeApi({
      "/a": [{ status: 401 }, { status: 200 }],
      "/b": [{ status: 401 }, { status: 200 }],
      "/c": [{ status: 401 }, { status: 200 }],
      "/auth/refresh": [{ status: 200 }],
    });
    await Promise.all([adminFetch("/a"), adminFetch("/b"), adminFetch("/c")]);
    expect(calls.filter((c) => c === "POST /auth/refresh")).toHaveLength(1);
  });

  it("goes to the login screen, remembering the page, when the refresh fails", async () => {
    fakeApi({ "/leads": [{ status: 401 }], "/auth/refresh": [{ status: 401 }] });
    await expect(adminFetch("/leads")).rejects.toBeInstanceOf(AdminApiError);
    expect(assign).toHaveBeenCalledWith("/admins/login?next=%2Fadmins%2Fenquiries%3Fstatus%3DNEW");
  });
});

describe("adminSend", () => {
  it("sends JSON and returns the parsed reply", async () => {
    const { fetchMock } = fakeApi({ "/leads/1": [{ status: 200, body: { id: "1", status: "WON" } }] });
    await expect(adminSend("PATCH", "/leads/1", { status: "WON" })).resolves.toEqual({ id: "1", status: "WON" });
    const init = fetchMock.mock.calls[0]![1]!;
    expect(init.method).toBe("PATCH");
    expect(init.body).toBe(JSON.stringify({ status: "WON" }));
  });

  it("turns an API error into a readable message with the field problems", async () => {
    fakeApi({
      "/projects": [{
        status: 400,
        body: { message: "Validation failed", issues: [{ path: ["titleBn"], message: "Required" }] },
      }],
    });
    const error = await adminSend("POST", "/projects", {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AdminApiError);
    expect((error as AdminApiError).status).toBe(400);
    expect((error as AdminApiError).fieldErrors).toEqual({ titleBn: "Required" });
  });

  it("returns nothing for a 204", async () => {
    fakeApi({ "/leads/1": [{ status: 204 }] });
    await expect(adminSend("DELETE", "/leads/1")).resolves.toBeUndefined();
  });
});

describe("loginPathFor", () => {
  it("only ever sends people back inside the panel", () => {
    // `next` comes from the URL, so anything else would be an open redirect.
    expect(loginPathFor("/admins/projects")).toBe("/admins/projects");
    expect(loginPathFor("https://evil.example/")).toBe("/admins");
    expect(loginPathFor("//evil.example/admins")).toBe("/admins");
    expect(loginPathFor(null)).toBe("/admins");
  });
});
