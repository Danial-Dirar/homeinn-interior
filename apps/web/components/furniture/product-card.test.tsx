import { fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProductView } from "@/lib/api.types";
import { renderWithIntl } from "@/test/render";
import { ProductCard } from "./product-card";

function product(over: Partial<ProductView> = {}): ProductView {
  return {
    id: "f1", slug: "teak-armchair",
    nameEn: "Teak Armchair", nameBn: "সেগুন আর্মচেয়ার",
    summaryEn: "Solid teak", summaryBn: "নিরেট সেগুন",
    descriptionEn: "<p>x</p>", descriptionBn: "<p>x</p>",
    priceBdt: null, madeToOrder: false, leadTimeDays: null,
    sortOrder: 0, featured: false, cover: null, secondView: null,
    ...over,
  };
}

// The card is below the fold: the observer never reports it in view.
beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }));
  vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
});
afterEach(() => vi.unstubAllGlobals());

function renderCard(over: Partial<ProductView> = {}) {
  return renderWithIntl(
    <ul>
      <ProductCard product={product(over)} locale="en" index={0} />
    </ul>,
  );
}

function image(id: string): NonNullable<ProductView["cover"]> {
  return {
    id, storageKey: id, mimeType: "image/png", width: 1760, height: 2368, bytes: 1000, blurhash: null,
    altEn: `Armchair ${id}`, altBn: `চেয়ার ${id}`, createdAt: "2026-10-19T00:00:00.000Z",
    sources: [{ type: "image/webp", srcset: `https://api.test/media/${id}/960.webp 960w` }],
  };
}

describe("ProductCard", () => {
  it("stays reachable by keyboard and screen reader while it waits to rise in", () => {
    // Hiding it with `visibility` took every card below the fold out of the tab
    // order: Tab went from the second card straight to the footer.
    renderCard();
    expect(screen.getByRole("link", { name: /Teak Armchair/ })).toBeInTheDocument();
  });

  it("turns to the piece's second view when it has one", () => {
    // Muhammad, 2026-10-19: the cover at its real angle, the front view on hover.
    const { container } = renderCard({ cover: image("angled"), secondView: image("front") });
    const second = container.querySelector("[data-second-view] img");
    expect(second).toHaveAttribute("src", "https://api.test/media/front/960.webp");
    expect(container.querySelector("[data-second-view]")?.closest(".group")).toBe(container.querySelector("li"));
  });

  it("finishes its entrance as soon as keyboard focus reaches it", () => {
    renderCard();
    const link = screen.getByRole("link", { name: /Teak Armchair/ });
    fireEvent.focusIn(link);
    expect(link.closest("li")).toHaveStyle({ opacity: "1" });
  });
});
