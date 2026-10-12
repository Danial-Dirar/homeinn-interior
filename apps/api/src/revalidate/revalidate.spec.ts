import { lastValueFrom, of } from "rxjs";
import { RevalidateInterceptor, RevalidateNotifier, tagsForWrite } from "./revalidate";

describe("tagsForWrite", () => {
  it("maps a content write to the web cache tag that page fetches carry", () => {
    expect(tagsForWrite("PATCH", "/api/projects/abc")).toEqual(["projects"]);
    expect(tagsForWrite("POST", "/api/products")).toEqual(["products"]);
    expect(tagsForWrite("DELETE", "/api/clients/corporate/abc")).toEqual(["clients"]);
    expect(tagsForWrite("PATCH", "/api/settings")).toEqual(["settings"]);
  });

  it("refreshes the project pages too when a working area is renamed", () => {
    expect(tagsForWrite("PATCH", "/api/working-areas/abc")).toEqual(["working-areas", "projects"]);
  });

  it("refreshes everything when alt text changes, since an image can appear anywhere", () => {
    expect(tagsForWrite("PATCH", "/api/media/abc")).toContain("hero");
    expect(tagsForWrite("PATCH", "/api/media/abc")).toContain("projects");
  });

  it("never fires on a read, a login, an enquiry or an account change", () => {
    expect(tagsForWrite("GET", "/api/projects")).toBeNull();
    expect(tagsForWrite("POST", "/api/auth/login")).toBeNull();
    expect(tagsForWrite("POST", "/api/leads")).toBeNull();
    expect(tagsForWrite("PATCH", "/api/leads/abc")).toBeNull();
    expect(tagsForWrite("POST", "/api/users")).toBeNull();
  });

  it("ignores a query string", () => {
    expect(tagsForWrite("POST", "/api/hero?x=1")).toEqual(["hero"]);
  });
});

describe("RevalidateInterceptor", () => {
  function context(method: string, url: string) {
    return { switchToHttp: () => ({ getRequest: () => ({ method, originalUrl: url }) }) } as never;
  }

  it("tells the web app after a successful write", async () => {
    const notifier = { send: jest.fn() } as unknown as RevalidateNotifier;
    const interceptor = new RevalidateInterceptor(notifier);
    await lastValueFrom(interceptor.intercept(context("PATCH", "/api/services/x"), { handle: () => of({}) }));
    expect(notifier.send).toHaveBeenCalledWith(["services"]);
  });

  it("stays quiet on a read", async () => {
    const notifier = { send: jest.fn() } as unknown as RevalidateNotifier;
    const interceptor = new RevalidateInterceptor(notifier);
    await lastValueFrom(interceptor.intercept(context("GET", "/api/services"), { handle: () => of([]) }));
    expect(notifier.send).not.toHaveBeenCalled();
  });
});

describe("RevalidateNotifier", () => {
  it("does nothing when the web app's address or the secret is not configured", () => {
    const fetcher = jest.fn();
    new RevalidateNotifier({}, fetcher).send(["projects"]);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("posts the tags with the shared secret", () => {
    const fetcher = jest.fn().mockResolvedValue({ ok: true });
    new RevalidateNotifier({ url: "http://web:3000/api/revalidate", secret: "s3cret" }, fetcher).send(["hero"]);
    expect(fetcher).toHaveBeenCalledWith("http://web:3000/api/revalidate", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ "x-revalidate-secret": "s3cret" }),
      body: JSON.stringify({ tags: ["hero"] }),
    }));
  });

  it("never throws when the web app is unreachable", async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    expect(() => new RevalidateNotifier({ url: "http://web/api/revalidate", secret: "s" }, fetcher).send(["hero"]))
      .not.toThrow();
  });
});
