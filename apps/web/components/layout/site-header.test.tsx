import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderWithIntl, settingsFixture } from "@/test/render";
import { SiteHeader } from "./site-header";

describe("SiteHeader", () => {
  it("orders the nav work-first, with About late", () => {
    // Pinned deliberately: a visitor wants what we do and what we have built
    // before who we are. Changing this order should be a decision, not a drift.
    renderWithIntl(<SiteHeader locale="en" settings={settingsFixture} />);
    const desktopNav = screen.getAllByRole("navigation")[0]!;
    // `textContent` picks up the NEW flag, which is a child of the link.
    expect([...desktopNav.querySelectorAll("a")].map((a) => a.textContent)).toEqual([
      "Home", "Architecture", "Services", "Projects", "FurnitureNew", "Clients", "About", "Contact",
    ]);
  });

  it("flags Furniture as new, without saying it twice to a screen reader", () => {
    renderWithIntl(<SiteHeader locale="en" settings={settingsFixture} />);
    // The link is named "Furniture", not "Furniture New" — the flag is decorative.
    expect(screen.getAllByRole("link", { name: "Furniture" }).length).toBeGreaterThan(0);
    expect(screen.getAllByText("New")[0]!.closest("[aria-hidden='true']")).not.toBeNull();
  });

  it("links to every route from spec §6", () => {
    renderWithIntl(<SiteHeader locale="en" settings={settingsFixture} />);
    for (const label of ["Home", "About", "Services", "Projects", "Clients", "Architecture", "Contact"]) {
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

  it("leads to architecture where the blog used to be", () => {
    renderWithIntl(<SiteHeader locale="en" settings={settingsFixture} />);
    expect(screen.getAllByRole("link", { name: "Architecture" })[0])
      .toHaveAttribute("href", "/en/services/architectural-design");
    expect(screen.queryByRole("link", { name: "Blog" })).not.toBeInTheDocument();
  });

  it("carries the Home inn wordmark as the link home", () => {
    renderWithIntl(<SiteHeader locale="en" settings={settingsFixture} />);
    expect(screen.getByRole("link", { name: "Home inn" })).toHaveAttribute("href", "/en");
  });

  it("sits on an ink ground, so its hover accent is ember", () => {
    const { container } = renderWithIntl(<SiteHeader locale="en" settings={settingsFixture} />);
    expect(container.querySelector("header")).toHaveClass("ground-ink");
  });

  it("is the site chrome, so the light theme puts it on the logo's cream", () => {
    const { container } = renderWithIntl(<SiteHeader locale="en" settings={settingsFixture} />);
    expect(container.querySelector("header")).toHaveClass("ground-chrome");
  });

  it("lets the hero show through, more on the cream than on ink", () => {
    // Charcoal on cream at 55% still clears 4.5:1 over a black pixel of the
    // photo; cream text on ink needs 75% to clear it over a white one.
    const { container } = renderWithIntl(<SiteHeader locale="en" settings={settingsFixture} />);
    expect(container.querySelector("header")).toHaveClass(
      "bg-ink/75", "[[data-theme=light]_&]:bg-ink/55", "backdrop-blur-md",
    );
  });

  it("offers the lights switch", () => {
    renderWithIntl(<SiteHeader locale="en" settings={settingsFixture} />);
    expect(screen.getByRole("button", { name: "Lights off" })).toBeInTheDocument();
  });

  it("opens the mobile menu on request", async () => {
    renderWithIntl(<SiteHeader locale="en" settings={settingsFixture} />);
    await userEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});
