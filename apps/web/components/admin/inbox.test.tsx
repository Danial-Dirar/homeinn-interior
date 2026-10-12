import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const adminGet = vi.fn();
vi.mock("@/lib/admin/api", () => ({ adminGet: (path: string) => adminGet(path) }));

import { Inbox } from "./inbox";

const lead = (over: Record<string, unknown> = {}) => ({
  id: "l1", type: "QUOTE", status: "NEW", name: "Rahim Uddin", phone: "01760775454", email: null,
  message: "A flat in Mirpur", locale: "bn", sourcePath: "/bn/contact", internalNotes: null,
  createdAt: "2026-10-12T10:00:00.000Z", service: { id: "s1", titleEn: "Interior Design", titleBn: "x" },
  ...over,
});

beforeEach(() => {
  adminGet.mockReset();
});

describe("Inbox", () => {
  it("asks for one status at a time, newest first", async () => {
    adminGet.mockResolvedValue({ items: [lead()], total: 1 });
    render(<Inbox status="NEW" page={1} />);
    expect(await screen.findByText("Rahim Uddin")).toBeInTheDocument();
    expect(adminGet).toHaveBeenCalledWith("/leads?status=NEW&page=1&perPage=25");
  });

  it("shows who, how to reach them, what they want and where it stands", async () => {
    adminGet.mockResolvedValue({ items: [lead()], total: 1 });
    render(<Inbox status="NEW" page={1} />);
    const row = (await screen.findByText("Rahim Uddin")).closest("tr")!;
    expect(row).toHaveTextContent("01760775454");
    expect(row).toHaveTextContent("Quote");
    expect(row).toHaveTextContent("Interior Design");
    expect(row).toHaveTextContent("New");
    expect(screen.getByRole("link", { name: "Rahim Uddin" })).toHaveAttribute("href", "/admins/enquiries/l1");
  });

  it("lists every status as a tab, with the current one marked", async () => {
    adminGet.mockResolvedValue({ items: [], total: 0 });
    render(<Inbox status="CONTACTED" page={1} />);
    expect(screen.getByRole("link", { name: "Contacted" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "All" })).toHaveAttribute("href", "/admins/enquiries?status=ALL");
  });

  it("says so when nothing is waiting", async () => {
    adminGet.mockResolvedValue({ items: [], total: 0 });
    render(<Inbox status="NEW" page={1} />);
    expect(await screen.findByText("Nothing here. Every enquiry has been answered.")).toBeInTheDocument();
  });

  it("asks for everything when the tab is All", async () => {
    adminGet.mockResolvedValue({ items: [], total: 0 });
    render(<Inbox status="ALL" page={2} />);
    await screen.findByText(/No enquiries yet/);
    expect(adminGet).toHaveBeenCalledWith("/leads?page=2&perPage=25");
  });
});
