import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Wordmark } from "./wordmark";

describe("Wordmark", () => {
  it("reads as the company name, not as two fragments", () => {
    render(<Wordmark />);
    expect(screen.getByText("Home").parentElement).toHaveTextContent("Home inn");
  });

  it("is live text in the display face, so it stays crisp at any size", () => {
    const { container } = render(<Wordmark />);
    expect(container.firstElementChild).toHaveClass("font-display");
    expect(container.querySelector("img, svg")).toBeNull();
  });

  it("sets Home in the ground's foreground colour on ink", () => {
    // text-bone flips to charcoal when the light theme turns the ground cream.
    render(<Wordmark tone="ink" />);
    expect(screen.getByText("Home")).toHaveClass("text-bone");
  });

  it("sets Home in charcoal on bone", () => {
    render(<Wordmark tone="bone" />);
    expect(screen.getByText("Home")).toHaveClass("text-ink");
  });

  it("keeps inn in the logo's exact burnt orange on every ground", () => {
    for (const tone of ["ink", "bone"] as const) {
      const { unmount } = render(<Wordmark tone={tone} />);
      expect(screen.getByText("inn")).toHaveClass("text-logo");
      unmount();
    }
  });
});
