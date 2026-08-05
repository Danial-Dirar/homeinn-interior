import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl, settingsFixture } from "@/test/render";
import { SiteFooter } from "./site-footer";

describe("SiteFooter", () => {
  it("shows the real NAP from settings", () => {
    renderWithIntl(<SiteFooter locale="en" settings={settingsFixture} />);
    expect(screen.getByText(/Mirpur-10, Dhaka-1216/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /01760775454/ }))
      .toHaveAttribute("href", "tel:01760775454");
    expect(screen.getByRole("link", { name: /homeinnbd14@gmail.com/ }))
      .toHaveAttribute("href", "mailto:homeinnbd14@gmail.com");
  });

  it("uses the Bangla address for bn", () => {
    renderWithIntl(<SiteFooter locale="bn" settings={settingsFixture} />, { locale: "bn" });
    expect(screen.getByText(/মিরপুর-১০/)).toBeInTheDocument();
  });

  it("omits a social link the settings do not carry", () => {
    renderWithIntl(<SiteFooter locale="en" settings={settingsFixture} />);
    expect(screen.getByRole("link", { name: "Facebook" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "YouTube" })).not.toBeInTheDocument();
  });

  it("credits the established year", () => {
    renderWithIntl(<SiteFooter locale="en" settings={settingsFixture} />);
    expect(screen.getByText(/2015/)).toBeInTheDocument();
  });
});
