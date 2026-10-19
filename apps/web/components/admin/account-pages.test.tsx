import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const adminGet = vi.fn();
const adminSend = vi.fn();
let role = "ADMIN";
vi.mock("@/lib/admin/api", () => ({
  adminGet: (path: string) => adminGet(path),
  adminSend: (...args: unknown[]) => adminSend(...args),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("./admin-context", () => ({ useAdmin: () => ({ user: { id: "me", name: "Me", email: "me@x.test", role } }) }));

import { AccountForm } from "./account-form";
import { SettingsForm } from "./settings-form";
import { UsersAdmin } from "./users-admin";

beforeEach(() => {
  adminGet.mockReset();
  adminSend.mockReset();
  role = "ADMIN";
});

describe("AccountForm", () => {
  it("refuses a new password that does not match its confirmation, before sending anything", async () => {
    render(<AccountForm />);
    await userEvent.type(screen.getByLabelText("Current password"), "old-password");
    await userEvent.type(screen.getByLabelText("New password"), "a-new-password-1");
    await userEvent.type(screen.getByLabelText("New password, again"), "a-new-password-2");
    await userEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(screen.getByRole("alert")).toHaveTextContent("The two new passwords are different.");
    expect(adminSend).not.toHaveBeenCalled();
  });

  it("changes the password and says the other devices are signed out", async () => {
    adminSend.mockResolvedValue({ ok: true });
    render(<AccountForm />);
    await userEvent.type(screen.getByLabelText("Current password"), "old-password");
    await userEvent.type(screen.getByLabelText("New password"), "a-new-password-1");
    await userEvent.type(screen.getByLabelText("New password, again"), "a-new-password-1");
    await userEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(adminSend).toHaveBeenCalledWith("POST", "/auth/password", {
      currentPassword: "old-password", newPassword: "a-new-password-1",
    });
    expect(await screen.findByRole("status")).toHaveTextContent(/signed out on every other device/);
  });
});

describe("SettingsForm", () => {
  const settings = {
    id: "singleton", phone: "01760775454", whatsapp: "01760775454", phoneSecondary: null, whatsappSecondary: null,
    email: "homeinnbd14@gmail.com", addressEn: "Dhaka", addressBn: "ঢাকা", hoursEn: "Sat–Thu", hoursBn: "শনি–বৃহস্পতি",
    facebookUrl: "https://facebook.com/homeinn", instagramUrl: null, youtubeUrl: null, establishedYear: 2015,
    corporateProjectCount: 73, residentialProjectCount: 57, districtCount: 13,
  };

  it("saves the whole settings row, clearing an emptied link with an empty string", async () => {
    adminGet.mockResolvedValue(settings);
    adminSend.mockResolvedValue(settings);
    render(<SettingsForm />);
    const facebook = await screen.findByLabelText("Facebook page");
    await userEvent.clear(facebook);
    await userEvent.click(screen.getByRole("button", { name: "Save settings" }));
    expect(adminSend).toHaveBeenCalledWith("PATCH", "/settings", expect.objectContaining({
      phone: "01760775454", facebookUrl: "", phoneSecondary: null, corporateProjectCount: 73,
    }));
  });

  it("is read-only for an editor, since the API lets only admins change it", async () => {
    role = "EDITOR";
    adminGet.mockResolvedValue(settings);
    render(<SettingsForm />);
    await screen.findByLabelText("Facebook page");
    expect(screen.queryByRole("button", { name: "Save settings" })).not.toBeInTheDocument();
    expect(screen.getByText(/Only an admin can change these/)).toBeInTheDocument();
  });
});

describe("UsersAdmin", () => {
  it("adds an account with a role and a first password", async () => {
    adminGet.mockResolvedValue([{ id: "me", name: "Me", email: "me@x.test", role: "ADMIN", createdAt: "2026-10-01T00:00:00Z" }]);
    adminSend.mockResolvedValue({ id: "u2", name: "Karim", email: "karim@x.test", role: "EDITOR", createdAt: "2026-10-13T00:00:00Z" });
    render(<UsersAdmin />);
    await screen.findByText("me@x.test");
    await userEvent.type(screen.getByLabelText("Name"), "Karim");
    await userEvent.type(screen.getByLabelText("Email"), "karim@x.test");
    await userEvent.type(screen.getByLabelText("First password"), "first-password-1");
    await userEvent.click(screen.getByRole("button", { name: "Add account" }));
    expect(adminSend).toHaveBeenCalledWith("POST", "/users", {
      name: "Karim", email: "karim@x.test", role: "EDITOR", password: "first-password-1",
    });
    expect(await screen.findByText("karim@x.test")).toBeInTheDocument();
  });

  it("never offers to delete your own account", async () => {
    adminGet.mockResolvedValue([{ id: "me", name: "Me", email: "me@x.test", role: "ADMIN", createdAt: "2026-10-01T00:00:00Z" }]);
    render(<UsersAdmin />);
    await screen.findByText("me@x.test");
    expect(screen.queryByRole("button", { name: /Delete/ })).not.toBeInTheDocument();
    expect(screen.getByText("You")).toBeInTheDocument();
  });

describe("UsersAdmin roles", () => {
  it("offers Moderator and Admin, and explains what a moderator may do", async () => {
    adminGet.mockResolvedValue([{ id: "me", name: "Me", email: "me@x.test", role: "ADMIN", createdAt: "2026-10-01T00:00:00Z" }]);
    render(<UsersAdmin />);
    await screen.findByText("me@x.test");
    const options = [...(screen.getByLabelText("Role") as HTMLSelectElement).options].map((o) => o.textContent);
    expect(options).toEqual(["Moderator", "Admin"]);
    expect(document.body).toHaveTextContent(/Moderators answer enquiries and keep the content current: prices/);
    expect(document.body).toHaveTextContent(/Admins can also change the site's structure/);
  });
});
});
