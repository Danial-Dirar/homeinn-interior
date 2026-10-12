import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const adminGet = vi.fn();
vi.mock("@/lib/admin/api", () => ({ adminGet: (path: string) => adminGet(path), adminUpload: vi.fn() }));

import { MediaPicker } from "./media-picker";

const image = (n: number) => ({ id: `m${n}`, altEn: `Image ${n}`, altBn: "ছবি", width: 10, height: 10, sources: [] });

function Harness() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open picker</button>
      <MediaPicker open={open} onOpenChange={setOpen} onChoose={() => {}} />
    </>
  );
}

beforeEach(() => {
  adminGet.mockReset();
  adminGet.mockImplementation(async (path: string) => {
    const page = Number(new URLSearchParams(path.split("?")[1]).get("page"));
    return { items: page === 1 ? [image(1), image(2)] : [image(3)], total: 3 };
  });
});

describe("MediaPicker", () => {
  it("starts from the first page each time it opens, never repeating images", async () => {
    render(<Harness />);
    await screen.findByText("Image 1");
    await userEvent.click(screen.getByRole("button", { name: "Load more" }));
    await screen.findByText("Image 3");

    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("button", { name: "Open picker" }));
    await new Promise((r) => setTimeout(r, 400));
    expect(adminGet.mock.calls.at(-1)?.[0]).toMatch(/[?&]page=1(&|$)/);
    expect(screen.getAllByText("Image 1")).toHaveLength(1);
    expect(screen.queryAllByText("Image 3")).toHaveLength(0);
  });
});
