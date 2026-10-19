import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl, settingsFixture } from "@/test/render";
import { SiteFooter } from "./site-footer";

describe("SiteFooter", () => {
  it("shows the real NAP from settings", () => {
    renderWithIntl(<SiteFooter locale="en" settings={settingsFixture} />);
    expect(screen.getByText(/Mirpur-10, Dhaka-1216/)).toBeInTheDocument();
    // Exact, not a substring: the WhatsApp control beside each number carries
    // the number in its own accessible name.
    expect(screen.getByRole("link", { name: "01760775454" }))
      .toHaveAttribute("href", "tel:01760775454");
    expect(screen.getByRole("link", { name: /homeinnbd14@gmail.com/ }))
      .toHaveAttribute("href", "mailto:homeinnbd14@gmail.com");
  });

  it("shows both numbers", () => {
    renderWithIntl(<SiteFooter locale="en" settings={settingsFixture} />);
    expect(screen.getByRole("link", { name: "01818843999" }))
      .toHaveAttribute("href", "tel:01818843999");
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

  it("signs off with the wordmark", () => {
    renderWithIntl(<SiteFooter locale="en" settings={settingsFixture} />);
    expect(screen.getByText("inn")).toHaveClass("text-logo");
  });

  it("sits on an ink ground, so its hover accent is ember", () => {
    const { container } = renderWithIntl(<SiteFooter locale="en" settings={settingsFixture} />);
    expect(container.querySelector("footer")).toHaveClass("ground-ink");
  });

  it("lists architecture, not the blog, in its menu", () => {
    renderWithIntl(<SiteFooter locale="en" settings={settingsFixture} />);
    expect(screen.getByRole("link", { name: "Architecture" }))
      .toHaveAttribute("href", "/en/services/architectural-design");
    expect(screen.queryByRole("link", { name: "Blog" })).not.toBeInTheDocument();
  });

  it("credits the established year", () => {
    renderWithIntl(<SiteFooter locale="en" settings={settingsFixture} />);
    expect(screen.getByText(/2015/)).toBeInTheDocument();
  });

  it("credits Haifa Intelligence, small, with a link to their site", () => {
    renderWithIntl(<SiteFooter locale="en" settings={settingsFixture} />);
    expect(screen.getByText(/Site developed and maintained by/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Haifa Intelligence" });
    expect(link).toHaveAttribute("href", "https://haifa-ai.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("underlines the credit's link, so it stands out by more than colour", () => {
    // axe (link-in-text-block): the link's colour is only 2.26:1 against the
    // muted sentence around it; an underline is what makes it a link.
    renderWithIntl(<SiteFooter locale="en" settings={settingsFixture} />);
    expect(screen.getByRole("link", { name: "Haifa Intelligence" })).toHaveClass("underline");
  });

  it("credits them in Bangla on Bangla pages", () => {
    renderWithIntl(<SiteFooter locale="bn" settings={settingsFixture} />, { locale: "bn" });
    expect(screen.getByText(/তৈরি ও রক্ষণাবেক্ষণ/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Haifa Intelligence" })).toBeInTheDocument();
  });
});
