import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const adminGet = vi.fn();
const adminSend = vi.fn();
const push = vi.fn();
vi.mock("@/lib/admin/api", () => ({
  adminGet: (path: string) => adminGet(path),
  adminSend: (...args: unknown[]) => adminSend(...args),
  AdminApiError: class extends Error {},
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("./admin-context", () => ({ useAdmin: () => ({ user: { role: "ADMIN" } }) }));
vi.mock("./rich-text-editor", () => ({
  RichTextEditor: ({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) => (
    <textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

import { resourceNamed } from "@/lib/admin/resources";
import { ResourceForm } from "./resource-form";

const areas = resourceNamed("working-areas")!;

beforeEach(() => {
  adminGet.mockReset();
  adminSend.mockReset();
  push.mockReset();
});

describe("ResourceForm", () => {
  it("lays out a bilingual field as English and Bangla side by side", () => {
    render(<ResourceForm resource={areas} />);
    expect(screen.getByLabelText("Name (English)")).toBeInTheDocument();
    expect(screen.getByLabelText("Name (Bangla)")).toBeInTheDocument();
  });

  it("refuses to send a half-filled form, and says which field", async () => {
    render(<ResourceForm resource={areas} />);
    await userEvent.type(screen.getByLabelText("Name (English)"), "Hospitality");
    await userEvent.click(screen.getByRole("button", { name: "Create working area" }));
    expect(screen.getByText("Required")).toBeInTheDocument();
    expect(adminSend).not.toHaveBeenCalled();
  });

  it("creates the row and opens it for further editing", async () => {
    adminSend.mockResolvedValue({ id: "w9" });
    render(<ResourceForm resource={areas} />);
    await userEvent.type(screen.getByLabelText("Name (English)"), "Hospitality");
    await userEvent.type(screen.getByLabelText("Name (Bangla)"), "আতিথেয়তা");
    await userEvent.click(screen.getByRole("button", { name: "Create working area" }));

    expect(adminSend).toHaveBeenCalledWith("POST", "/working-areas", { nameEn: "Hospitality", nameBn: "আতিথেয়তা", sortOrder: 0 });
    expect(push).toHaveBeenCalledWith("/admins/working-areas/w9?created=1");
  });

  it("loads a saved row by id and saves changes to it", async () => {
    adminGet.mockResolvedValue({ id: "w1", nameEn: "Residential", nameBn: "আবাসিক", sortOrder: 2, _count: { projects: 4 } });
    adminSend.mockResolvedValue({ id: "w1" });
    render(<ResourceForm resource={areas} id="w1" />);
    const english = await screen.findByDisplayValue("Residential");
    expect(adminGet).toHaveBeenCalledWith("/admin/working-areas/w1");

    await userEvent.clear(english);
    await userEvent.type(english, "Homes");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(adminSend).toHaveBeenCalledWith("PATCH", "/working-areas/w1", { nameEn: "Homes", nameBn: "আবাসিক", sortOrder: 2 });
    expect(await screen.findByRole("status")).toHaveTextContent("Saved");
  });

  it("shows the API's own field problems next to the field", async () => {
    const { AdminApiError } = await import("@/lib/admin/api");
    const error = Object.assign(new (AdminApiError as unknown as new (m: string) => Error)("Validation failed"), {
      status: 400, fieldErrors: { nameBn: "String must contain at least 1 character(s)" },
    });
    adminSend.mockRejectedValue(error);
    render(<ResourceForm resource={areas} />);
    await userEvent.type(screen.getByLabelText("Name (English)"), "A");
    await userEvent.type(screen.getByLabelText("Name (Bangla)"), "ক");
    await userEvent.click(screen.getByRole("button", { name: "Create working area" }));
    expect(await screen.findByText("String must contain at least 1 character(s)")).toBeInTheDocument();
  });
});
