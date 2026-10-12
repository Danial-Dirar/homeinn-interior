import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const adminGet = vi.fn();
vi.mock("@/lib/admin/api", () => ({ adminGet: (path: string) => adminGet(path) }));
vi.mock("./admin-context", () => ({ useAdmin: () => ({ user: { name: "Muhammad Rahman", role: "ADMIN" } }) }));

import { Overview } from "./overview";

const summary = (newCount: number) => ({
  leads: { NEW: newCount, CONTACTED: 1, QUALIFIED: 0, WON: 2, LOST: 0, total: newCount + 3 },
  recentLeads: [{
    id: "l1", type: "QUOTE", status: "NEW", name: "Rahim Uddin", phone: "01760775454",
    createdAt: new Date().toISOString(), service: null,
  }],
  content: { projects: { total: 27, drafts: 2 }, products: { total: 6, drafts: 0 }, "working-areas": { total: 11 } },
});

beforeEach(() => {
  adminGet.mockReset();
});

describe("Overview", () => {
  it("says in a sentence how many enquiries are waiting, and links to them", async () => {
    adminGet.mockResolvedValue(summary(3));
    render(<Overview />);
    expect(await screen.findByText(/3 enquiries are waiting for a reply/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Answer them" })).toHaveAttribute("href", "/admins/enquiries?status=NEW");
  });

  it("is plain about an empty inbox", async () => {
    adminGet.mockResolvedValue(summary(0));
    render(<Overview />);
    expect(await screen.findByText("No enquiries are waiting. Everything has been answered.")).toBeInTheDocument();
  });

  it("names the drafts that are not on the site yet", async () => {
    adminGet.mockResolvedValue(summary(1));
    render(<Overview />);
    expect(await screen.findByText(/2 projects/)).toBeInTheDocument();
    expect(screen.getByText(/1 enquiry is waiting for a reply/)).toBeInTheDocument();
  });

  it("lists the latest enquiries", async () => {
    adminGet.mockResolvedValue(summary(1));
    render(<Overview />);
    expect(await screen.findByRole("link", { name: /Rahim Uddin/ })).toHaveAttribute("href", "/admins/enquiries/l1");
  });
});
