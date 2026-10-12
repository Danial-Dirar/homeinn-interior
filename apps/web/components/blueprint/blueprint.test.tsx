import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Blueprint } from "./blueprint";

function motion(reduced: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduced && query.includes("reduce"),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

// jsdom has no IntersectionObserver; this one reports "in view" at once.
class InView {
  constructor(private readonly cb: IntersectionObserverCallback) {}
  observe() { this.cb([{ isIntersecting: true } as IntersectionObserverEntry], this as never); }
  disconnect() {}
}

beforeEach(() => vi.stubGlobal("IntersectionObserver", InView));
afterEach(() => vi.unstubAllGlobals());

describe("Blueprint", () => {
  it("draws the named plan as a mask over the current text colour", () => {
    // currentColor is what lets the lines follow the theme.
    motion(false);
    const { container } = render(<Blueprint plan="ground-floor" />);
    const lines = container.querySelector("[data-blueprint-lines]") as HTMLElement;
    expect(lines.style.maskImage || lines.style.webkitMaskImage).toContain("/blueprints/ground-floor.webp");
    expect(lines).toHaveClass("bg-current");
  });

  it("is decorative unless it is given a label", () => {
    motion(false);
    const { container, rerender } = render(<Blueprint plan="first-floor" />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    rerender(<Blueprint plan="first-floor" label="First-floor plan" />);
    expect(container.firstElementChild).toHaveAttribute("role", "img");
    expect(container.firstElementChild).toHaveAttribute("aria-label", "First-floor plan");
  });

  it("draws itself in once it is in view", () => {
    motion(false);
    const { container } = render(<Blueprint plan="ground-floor" />);
    expect(container.firstElementChild).toHaveAttribute("data-revealed", "true");
    const lines = container.querySelector("[data-blueprint-lines]") as HTMLElement;
    expect(lines.style.clipPath).toBe("inset(0px 0% 0px 0px)");
  });

  it("holds the plan's own proportions, so the page does not jump", () => {
    motion(false);
    const { container } = render(<Blueprint plan="ground-floor" />);
    expect((container.firstElementChild as HTMLElement).style.aspectRatio).toBe("1600 / 1356");
  });

  it("is complete and still under reduced motion: no wipe, no pen", () => {
    motion(true);
    vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
    const { container } = render(<Blueprint plan="ground-floor" />);
    expect(container.firstElementChild).toHaveAttribute("data-revealed", "true");
    expect(container.querySelector("[data-blueprint-pen]")).toBeNull();
  });

  it("lets a caller position it, without a competing relative class", () => {
    // The statement lays it absolutely behind the copy; "relative absolute"
    // would let stylesheet order decide which wins.
    motion(false);
    const { container } = render(<Blueprint plan="first-floor" className="absolute" />);
    expect(container.firstElementChild).toHaveClass("absolute");
    expect(container.firstElementChild).not.toHaveClass("relative");
  });

  it("waits until it is in view before drawing", () => {
    // useReveal used to reveal on mount: the reduced-motion hook starts true
    // until the preference is read, and the first effect took that as "reduce".
    // Every reveal on the site finished before anyone scrolled to it.
    motion(false);
    vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
    const { container } = render(<Blueprint plan="ground-floor" />);
    expect(container.firstElementChild).toHaveAttribute("data-revealed", "false");
  });
});
