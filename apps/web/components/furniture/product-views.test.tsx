import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MediaView } from "@/lib/api.types";
import { ProductViews } from "./product-views";

function media(id: string, altEn: string): MediaView {
  return {
    id, storageKey: id, mimeType: "image/png",
    width: 1760, height: 2368, bytes: 1000, blurhash: null,
    altEn, altBn: altEn, createdAt: "2026-10-19T00:00:00.000Z",
    sources: [{ type: "image/webp", srcset: `https://api.test/media/${id}/960.webp 960w` }],
  };
}

const cover = media("c", "Wardrobe, angled");
const front = media("f", "Wardrobe, from the front");

describe("ProductViews", () => {
  it("shows the cover alone when the piece has no second view", () => {
    const { container } = render(<ProductViews cover={cover} secondView={null} locale="en" sizes="50vw" />);
    expect(container.querySelectorAll("img")).toHaveLength(1);
    expect(container.querySelector("[data-second-view]")).toBeNull();
  });

  it("lays the second view over the cover, out of the accessibility tree", () => {
    // The same piece twice would read its description twice; the cover speaks for both.
    const { container } = render(<ProductViews cover={cover} secondView={front} locale="en" sizes="50vw" />);
    const second = container.querySelector("[data-second-view]") as HTMLElement;
    expect(second).toHaveAttribute("aria-hidden", "true");
    expect(second.querySelector("img")).toHaveAttribute("src", "https://api.test/media/f/960.webp");
    expect(second).toHaveClass("absolute", "inset-0", "opacity-0");
  });

  it("brings the second view in on hover and on keyboard focus", () => {
    const { container } = render(<ProductViews cover={cover} secondView={front} locale="en" sizes="50vw" />);
    const second = container.querySelector("[data-second-view]") as HTMLElement;
    expect(second).toHaveClass("group-hover:opacity-100", "group-has-[:focus-visible]:opacity-100");
  });
});
