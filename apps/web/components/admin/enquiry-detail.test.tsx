import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const adminGet = vi.fn();
const adminSend = vi.fn();
vi.mock("@/lib/admin/api", () => ({
  adminGet: (path: string) => adminGet(path),
  adminSend: (...args: unknown[]) => adminSend(...args),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("./admin-context", () => ({ useAdmin: () => ({ user: { role: "ADMIN" } }) }));

import { EnquiryDetail } from "./enquiry-detail";

const lead = {
  id: "l1", type: "CONSULTATION", status: "NEW", name: "Rahim Uddin", phone: "01760775454",
  email: "rahim@example.com", message: "Please call after 5pm.\nThe flat is 1,400 sq ft.",
  locale: "bn", sourcePath: "/bn/contact", internalNotes: null,
  createdAt: "2026-10-12T10:00:00.000Z", service: null,
};

beforeEach(() => {
  adminGet.mockReset().mockResolvedValue(lead);
  adminSend.mockReset().mockImplementation(async (_m: string, _p: string, body: object) => ({ ...lead, ...body }));
});

describe("EnquiryDetail", () => {
  it("shows the whole message and every way to reply", async () => {
    render(<EnquiryDetail id="l1" />);
    expect(await screen.findByText(/Please call after 5pm\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Call/ })).toHaveAttribute("href", "tel:01760775454");
    expect(screen.getByRole("link", { name: /WhatsApp/ })).toHaveAttribute("href", "https://wa.me/8801760775454");
    expect(screen.getByRole("link", { name: /Email/ })).toHaveAttribute("href", "mailto:rahim@example.com");
    expect(screen.getByText("Bangla")).toBeInTheDocument();
  });

  it("saves a new status and internal notes", async () => {
    render(<EnquiryDetail id="l1" />);
    await screen.findByText(/Please call after 5pm\./);
    await userEvent.selectOptions(screen.getByLabelText("Status"), "CONTACTED");
    await userEvent.type(screen.getByLabelText("Internal notes"), "Called, visiting Saturday.");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(adminSend).toHaveBeenCalledWith("PATCH", "/leads/l1", {
      status: "CONTACTED", internalNotes: "Called, visiting Saturday.",
    });
    expect(await screen.findByRole("status")).toHaveTextContent("Saved");
  });
});
