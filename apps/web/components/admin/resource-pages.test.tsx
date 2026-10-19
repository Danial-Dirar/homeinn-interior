import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let role = "EDITOR";
const adminGet = vi.fn();
vi.mock("@/lib/admin/api", () => ({ adminGet: (path: string) => adminGet(path), adminSend: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("./admin-context", () => ({ useAdmin: () => ({ user: { id: "u", name: "U", email: "u@x.test", role } }) }));

import { ResourceFormPage, ResourceListPage } from "./resource-pages";

beforeEach(() => {
  adminGet.mockReset();
  adminGet.mockResolvedValue([]);
});

describe("structure pages for a moderator", () => {
  it("say plainly that only an admin changes the site's structure, and load nothing", () => {
    role = "EDITOR";
    render(<ResourceListPage name="services" />);
    expect(screen.getByRole("status")).toHaveTextContent(/Only an admin/);
    expect(screen.queryByRole("link", { name: /New service/ })).not.toBeInTheDocument();
    expect(adminGet).not.toHaveBeenCalled();
  });

  it("keep the editor closed too, even when its address is typed in", () => {
    role = "EDITOR";
    render(<ResourceFormPage name="hero" id="h1" />);
    expect(screen.getByRole("status")).toHaveTextContent(/Only an admin/);
    expect(screen.queryByRole("button", { name: /Save/ })).not.toBeInTheDocument();
  });

  it("leave a moderator's own work open", async () => {
    role = "EDITOR";
    render(<ResourceListPage name="products" />);
    expect(await screen.findByRole("link", { name: /New piece/ })).toBeInTheDocument();
  });

  it("open everything to an admin", async () => {
    role = "ADMIN";
    render(<ResourceListPage name="services" />);
    expect(await screen.findByRole("link", { name: /New service/ })).toBeInTheDocument();
  });
});
