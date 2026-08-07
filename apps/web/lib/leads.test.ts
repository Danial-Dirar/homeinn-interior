import { afterEach, describe, expect, it, vi } from "vitest";
import { submitLead } from "./leads";

const valid = {
  type: "CONSULTATION" as const,
  name: "Rahim",
  phone: "01760775454",
  locale: "bn" as const,
};

function stubFetch(status: number) {
  const spy = vi.fn(async (...args: unknown[]) => ({
    ok: status < 400,
    status,
    json: async () => ({}),
    args,
  }));
  vi.stubGlobal("fetch", spy);
  return spy;
}

afterEach(() => vi.unstubAllGlobals());

describe("submitLead", () => {
  it("posts to the API directly, not through the Next server", async () => {
    const spy = stubFetch(201);
    await submitLead(valid);
    expect(spy.mock.calls[0]?.[0]).toBe("http://localhost:4000/api/leads");
    expect((spy.mock.calls[0]?.[1] as RequestInit).method).toBe("POST");
  });

  it("normalises the phone number before sending", async () => {
    const spy = stubFetch(201);
    await submitLead({ ...valid, phone: "+880 1760-775 454" });
    const body = JSON.parse((spy.mock.calls[0]?.[1] as RequestInit).body as string);
    expect(body.phone).toBe("01760775454");
  });

  it("rejects an invalid phone number without calling the API", async () => {
    const spy = stubFetch(201);
    const result = await submitLead({ ...valid, phone: "12345" });
    expect(result).toEqual({ ok: false, reason: "invalid" });
    expect(spy).not.toHaveBeenCalled();
  });

  it("reports a 429 as throttled, not as a generic failure", async () => {
    stubFetch(429);
    await expect(submitLead(valid)).resolves.toEqual({ ok: false, reason: "throttled" });
  });

  it("reports any other failure as network", async () => {
    stubFetch(500);
    await expect(submitLead(valid)).resolves.toEqual({ ok: false, reason: "network" });
  });

  it("succeeds on a 201", async () => {
    stubFetch(201);
    await expect(submitLead(valid)).resolves.toEqual({ ok: true });
  });
});
