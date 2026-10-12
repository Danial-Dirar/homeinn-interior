import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Reveal } from "./reveal";

function motion(reduced: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduced && query.includes("reduce"), media: query,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }));
}

/** An observer the test can trigger, as if the element scrolled into view. */
function observer() {
  let report: (visible: boolean) => void = () => {};
  vi.stubGlobal("IntersectionObserver", class {
    constructor(cb: IntersectionObserverCallback) {
      report = (visible) => cb([{ isIntersecting: visible } as IntersectionObserverEntry], this as never);
    }
    observe() {}
    disconnect() {}
  });
  return (visible: boolean) => act(() => report(visible));
}

afterEach(() => vi.unstubAllGlobals());

describe("Reveal", () => {
  it("waits below the fold, still readable by a screen reader", () => {
    motion(false);
    observer();
    render(<Reveal><a href="#work">Our projects</a></Reveal>);
    const link = screen.getByRole("link", { name: "Our projects" });
    expect(link.parentElement).toHaveAttribute("data-revealed", "false");
  });

  it("rises in when it scrolls into view", () => {
    motion(false);
    const scrollTo = observer();
    render(<Reveal>Text</Reveal>);
    scrollTo(true);
    expect(screen.getByText("Text")).toHaveAttribute("data-revealed", "true");
  });

  it("is simply there for a visitor who asked for less motion", () => {
    motion(true);
    observer();
    render(<Reveal>Text</Reveal>);
    expect(screen.getByText("Text")).toHaveAttribute("data-revealed", "true");
  });

  it("is simply there in a browser without IntersectionObserver", () => {
    // Hiding content until an event that can never fire would lose it.
    motion(false);
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<Reveal>Text</Reveal>);
    expect(screen.getByText("Text")).toHaveAttribute("data-revealed", "true");
  });

  it("is simply there where matchMedia is missing", () => {
    vi.stubGlobal("matchMedia", undefined);
    observer();
    render(<Reveal>Text</Reveal>);
    expect(screen.getByText("Text")).toBeInTheDocument();
  });

  it("finishes at once when keyboard focus reaches something inside it", () => {
    motion(false);
    observer();
    render(<Reveal><a href="#inside">Inside</a></Reveal>);
    fireEvent.focusIn(screen.getByRole("link", { name: "Inside" }));
    expect(screen.getByRole("link", { name: "Inside" }).parentElement).toHaveAttribute("data-revealed", "true");
  });

  it("can stagger, and can unveil an image instead of lifting it", () => {
    motion(false);
    observer();
    render(<Reveal variant="wipe" delay={120} as="figure">Image</Reveal>);
    const el = screen.getByText("Image");
    expect(el.tagName).toBe("FIGURE");
    expect(el).toHaveAttribute("data-reveal", "wipe");
    expect(el.style.transitionDelay).toBe("120ms");
  });
});
