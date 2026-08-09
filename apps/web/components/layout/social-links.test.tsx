import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl, settingsFixture } from "@/test/render";
import { SocialLinks } from "./social-links";

describe("SocialLinks", () => {
  it("renders only the configured profiles", () => {
    renderWithIntl(<SocialLinks settings={settingsFixture} />);
    expect(screen.getByRole("link", { name: "Facebook" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Instagram" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "YouTube" })).not.toBeInTheDocument();
  });

  it("opens them in a new tab, safely", () => {
    renderWithIntl(<SocialLinks settings={settingsFixture} />);
    const facebook = screen.getByRole("link", { name: "Facebook" });
    expect(facebook).toHaveAttribute("target", "_blank");
    expect(facebook).toHaveAttribute("rel", "noreferrer noopener");
  });

  it("renders nothing at all when none are configured", () => {
    const { container } = renderWithIntl(
      <SocialLinks settings={{ ...settingsFixture, facebookUrl: null, instagramUrl: null }} />);
    expect(container.querySelectorAll("a")).toHaveLength(0);
  });

  it("names each link so the icon is not the only cue", () => {
    renderWithIntl(<SocialLinks settings={settingsFixture} />);
    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("aria-label")).toBeTruthy();
    }
  });
});
