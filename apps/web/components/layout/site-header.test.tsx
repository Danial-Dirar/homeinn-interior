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

  it("exposes a persistent WhatsApp affordance", () => {
    renderWithIntl(<SiteHeader locale="en" settings={settingsFixture} />);
    expect(screen.getByRole("link", { name: "Chat on WhatsApp" }))
      .toHaveAttribute("href", "https://wa.me/8801760775454");
  });

  it("opens the mobile menu on request", async () => {
    renderWithIntl(<SiteHeader locale="en" settings={settingsFixture} />);
    await userEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});
