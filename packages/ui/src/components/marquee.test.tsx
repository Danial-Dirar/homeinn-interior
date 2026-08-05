import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Marquee } from "./marquee";

describe("Marquee", () => {
  it("renders its children exactly once for assistive technology", () => {
    // The track is duplicated so the loop has no gap, so the content appears
    // twice in the DOM — but a screen reader must hear the list once.
    const { container } = render(<Marquee><span>BFIDC</span></Marquee>);
    const exposed = [...container.querySelectorAll("[data-marquee-track]")].filter(
      (track) => !track.hasAttribute("aria-hidden"),
    );

    expect(exposed).toHaveLength(1);
    expect(exposed[0]).toHaveTextContent("BFIDC");
    expect(screen.getAllByText("BFIDC")).toHaveLength(2);
  });

  it("duplicates the track so the loop has no gap", () => {
    const { container } = render(<Marquee><span>BFIDC</span></Marquee>);
    expect(container.querySelectorAll("[data-marquee-track]")).toHaveLength(2);
  });

  it("hides the duplicate from assistive technology", () => {
    const { container } = render(<Marquee><span>BFIDC</span></Marquee>);
    const tracks = container.querySelectorAll("[data-marquee-track]");
    expect(tracks[1]).toHaveAttribute("aria-hidden", "true");
  });

  it("takes its duration from the speed prop", () => {
    const { container } = render(<Marquee speedSeconds={40}><span>x</span></Marquee>);
    expect(container.firstElementChild).toHaveStyle({ "--marquee-duration": "40s" });
  });
});
