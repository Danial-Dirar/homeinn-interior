import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl, settingsFixture } from "@/test/render";
import { Statement } from "./statement";

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }));
  vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
});

describe("Statement", () => {
  it("shows the three headline counts from settings", () => {
    // Spec §12: only stats that trace to the profile document.
    renderWithIntl(<Statement locale="en" settings={settingsFixture} />);
    expect(screen.getByText("73")).toBeInTheDocument();
    expect(screen.getByText("57")).toBeInTheDocument();
    expect(screen.getByText("13")).toBeInTheDocument();
  });

  it("states the figures in a sentence, not as a dashboard of big numbers", () => {
    // Oversized numerals over small tracked labels read as a template. The
    // figures belong in what the company says about itself.
    const { container } = renderWithIntl(<Statement locale="en" settings={settingsFixture} />);
    expect(container.querySelector("dl")).toBeNull();
    expect(screen.getByText("73").closest("p")).toHaveTextContent(
      "So far: 73 corporate projects and 57 residential ones, across 13 districts of Bangladesh.",
    );
  });

  it("sets the figures at the sentence's own size, picked out only by colour", () => {
    renderWithIntl(<Statement locale="en" settings={settingsFixture} />);
    const figure = screen.getByText("73");
    expect(figure.tagName).toBe("STRONG");
    expect(figure).toHaveClass("text-accent");
    expect(figure.className).not.toMatch(/display-/);
  });

  it("writes the sentence in Bangla, with Bangla numerals", () => {
    renderWithIntl(<Statement locale="bn" settings={settingsFixture} />, { locale: "bn" });
    expect(screen.getByText("৭৩").closest("p")).toHaveTextContent("৫৭টি আবাসিক");
  });

  it("never claims clients where the source says projects", () => {
    // Spec §2's counting rule: the corporate list repeats clients across sites.
    renderWithIntl(<Statement locale="en" settings={settingsFixture} />);
    expect(screen.queryByText(/corporate clients/i)).not.toBeInTheDocument();
  });

  it("lays a faint first-floor plan behind the statement, hidden from assistive technology", () => {
    const { container } = renderWithIntl(<Statement locale="en" settings={settingsFixture} />);
    const plan = container.querySelector("[data-blueprint-lines]")?.parentElement;
    expect(plan).toHaveAttribute("aria-hidden", "true");
    expect((plan?.querySelector("[data-blueprint-lines]") as HTMLElement).style.maskImage)
      .toContain("first-floor");
  });

  it("draws the plan in the logo's cream when the lights are off", () => {
    // Charcoal at 7% is a drawing on cream; the same 7% of the light ink that
    // dark mode swaps in vanished into the charcoal ground (Muhammad, 2026-10-19).
    const { container } = renderWithIntl(<Statement locale="en" settings={settingsFixture} />);
    const plan = container.querySelector("[data-blueprint-lines]")?.parentElement as HTMLElement;
    expect(plan.className).toContain("text-ink/[0.07]");
    expect(plan.className).toContain("dark:text-[#F3EDE2]/20");
  });

  it("keeps the backdrop plan inside the page, so it never scrolls sideways", () => {
    // Nothing above the statement clips overflow and the container pads only
    // 20px, so a negative right offset pushed the plan past the viewport edge
    // on laptop widths: 1044px of page in a 1024px window.
    const { container } = renderWithIntl(<Statement locale="en" settings={settingsFixture} />);
    const plan = container.querySelector("[data-blueprint-lines]")?.parentElement as HTMLElement;
    expect(plan.className).not.toMatch(/(^|\s)-right-/);
  });
});
