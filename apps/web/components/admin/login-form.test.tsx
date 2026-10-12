import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }) }));

import { LoginForm } from "./login-form";

function answer(status: number, body: unknown = {}) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function signIn(password = "a-good-password") {
  await userEvent.type(screen.getByLabelText("Email"), "admin@homeinn.test");
  await userEvent.type(screen.getByLabelText("Password"), password);
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

beforeEach(() => {
  replace.mockClear();
});
afterEach(() => vi.unstubAllGlobals());

describe("LoginForm", () => {
  it("signs in with the session cookies and goes back to the page that asked", async () => {
    const fetchMock = answer(200, { user: { name: "Admin" } });
    render(<LoginForm next="/admins/projects" />);
    await signIn();

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/auth\/login$/);
    expect(init).toMatchObject({ method: "POST", credentials: "include" });
    expect(JSON.parse(String(init.body))).toEqual({ email: "admin@homeinn.test", password: "a-good-password" });
    expect(replace).toHaveBeenCalledWith("/admins/projects");
  });

  it("says plainly when the email and password do not match", async () => {
    answer(401);
    render(<LoginForm next={null} />);
    await signIn();
    expect(await screen.findByRole("alert")).toHaveTextContent("That email and password don't match.");
    expect(replace).not.toHaveBeenCalled();
  });

  it("explains the wait after too many attempts", async () => {
    answer(429);
    render(<LoginForm next={null} />);
    await signIn();
    expect(await screen.findByRole("alert")).toHaveTextContent(/Too many attempts/);
  });

  it("never keeps the password anywhere but the request", async () => {
    answer(401);
    render(<LoginForm next={null} />);
    await signIn("secret-password-1");
    expect(window.location.href).not.toContain("secret-password-1");
    expect(JSON.stringify({ ...localStorage })).not.toContain("secret-password-1");
    expect(screen.getByRole("form", { name: "Sign in" })).toHaveAttribute("method", "post");
  });
});
