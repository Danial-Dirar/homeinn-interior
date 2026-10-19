import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const adminGet = vi.fn();
vi.mock("@/lib/admin/api", () => ({
  adminGet: (path: string) => adminGet(path),
  adminSend: vi.fn(),
  goToLogin: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/admins",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

import { AdminShell } from "./admin-shell";

beforeEach(() => {
  adminGet.mockReset();
});

describe("AdminShell", () => {
  it("shows nothing of the panel until the session is confirmed", async () => {
    let signOut: (reason: Error) => void = () => {};
    adminGet.mockReturnValue(new Promise((_, reject) => { signOut = reject; }));
    render(<AdminShell><p>Secret inbox</p></AdminShell>);
    expect(screen.queryByText("Secret inbox")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Checking your session");

    // The API refuses (adminFetch has gone to the login screen): still nothing.
    await act(async () => signOut(new Error("401")));
    expect(screen.queryByText("Secret inbox")).not.toBeInTheDocument();
  });

  it("opens the panel for a signed-in person, with their name and the sections", async () => {
    adminGet.mockImplementation(async (path: string) => {
      if (path === "/auth/me") return { user: { id: "u1", name: "Muhammad", email: "m@x.test", role: "ADMIN" } };
      return { items: [], total: 3 };
    });
    render(<AdminShell><p>Secret inbox</p></AdminShell>);
    expect(await screen.findByText("Secret inbox")).toBeInTheDocument();
    expect(screen.getAllByText("Muhammad").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /Enquiries/ })[0]).toHaveAttribute("href", "/admins/enquiries");
    expect(screen.getAllByRole("link", { name: /Projects/ })[0]).toHaveAttribute("href", "/admins/projects");
  });

  it("shows accounts only to an admin", async () => {
    adminGet.mockImplementation(async (path: string) => {
      if (path === "/auth/me") return { user: { id: "u2", name: "Editor", email: "e@x.test", role: "EDITOR" } };
      return { items: [], total: 0 };
    });
    render(<AdminShell><p>Panel</p></AdminShell>);
    await screen.findByText("Panel");
    expect(screen.queryByRole("link", { name: "Accounts" })).not.toBeInTheDocument();
  });

  it("counts the enquiries waiting for a reply beside the inbox link", async () => {
    adminGet.mockImplementation(async (path: string) => {
      if (path === "/auth/me") return { user: { id: "u1", name: "M", email: "m@x.test", role: "ADMIN" } };
      if (path.startsWith("/leads?status=NEW")) return { items: [], total: 3 };
      return {};
    });
    render(<AdminShell><p>Panel</p></AdminShell>);
    await screen.findByText("Panel");
    expect((await screen.findAllByText("3 new"))[0]).toBeInTheDocument();
  });

  it("says so, and offers to try again, when the API cannot be reached", async () => {
    adminGet.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    render(<AdminShell><p>Panel</p></AdminShell>);
    expect(await screen.findByRole("alert")).toHaveTextContent(/can't reach the server/i);

    adminGet.mockImplementation(async (path: string) => {
      if (path === "/auth/me") return { user: { id: "u1", name: "M", email: "m@x.test", role: "ADMIN" } };
      return { items: [], total: 0 };
    });
    screen.getByRole("button", { name: "Try again" }).click();
    expect(await screen.findByText("Panel")).toBeInTheDocument();
  });

  it("shows a moderator the day-to-day work, not the site's structure", async () => {
    adminGet.mockImplementation(async (path: string) => {
      if (path === "/auth/me") return { user: { id: "m", name: "Moderator", email: "m@x.test", role: "EDITOR" } };
      return { items: [], total: 0 };
    });
    render(<AdminShell><p>Panel</p></AdminShell>);
    await screen.findByText("Panel");
    for (const label of ["Projects", "Furniture", "Testimonials", "Media"]) {
      expect(screen.getAllByRole("link", { name: label }).length, label).toBeGreaterThan(0);
    }
    for (const label of ["Services", "Working areas", "Hero", "Settings", "Accounts"]) {
      expect(screen.queryByRole("link", { name: label }), label).not.toBeInTheDocument();
    }
    expect(screen.getByText(/· Moderator/)).toBeInTheDocument();
  });
});
