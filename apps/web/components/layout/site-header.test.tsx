import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderWithIntl, settingsFixture } from "@/test/render";
import { SiteHeader } from "./site-header";

describe("SiteHeader", () => {
  it("links to all seven routes from spec §6", () => {
    renderWithIntl(<SiteHeader locale="en" settings={settingsFixture} />);
    for (const label of ["Home", "About", "Services", "Projects", "Clients", "Blog", "Contact"]) {
      expect(screen.getAllByRole("link", { name: label }).length).toBeGreaterThan(0);
    }
  });

  it("renders the nav in Bangla for bn", () => {
    renderWithIntl(<SiteHeader locale="bn" settings={settingsFixture} />, { locale: "bn" });
    expect(screen.getAllByRole("link", { name: "প্রকল্প" }).length).toBeGreaterThan(0);
  });

  it("offers the other language, not the current one, as the active choice", () => {
    renderWithIntl(<SiteHeader locale="en" settings={settingsFixture} />);
    expect(screen.getByRole("link", { name: "বাংলা" })).toHaveAttribute("hreflang", "bn");
  });

  it("links to the social profiles that exist, and no others", () => {
    renderWithIntl(<SiteHeader locale="en" settings={settingsFixture} />);
    expect(screen.getByRole("link", { name: "Facebook" }))
      .toHaveAttribute("href", "https://www.facebook.com/homeinnbd14");
    expect(screen.getByRole("link", { name: "Instagram" })).toBeInTheDocument();
    // The fixture has no YouTube URL; a dead link is worse than no link.
    expect(screen.queryByRole("link", { name: "YouTube" })).not.toBeInTheDocument();
  });

  it("leaves WhatsApp to the floating button rather than the bar", () => {
    renderWithIntl(<SiteHeader locale="en" settings={settingsFixture} />);
    expect(screen.queryByRole("link", { name: /Chat on WhatsApp/ })).not.toBeInTheDocument();
  });

  it("opens the mobile menu on request", async () => {
    renderWithIntl(<SiteHeader locale="en" settings={settingsFixture} />);
    await userEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});
