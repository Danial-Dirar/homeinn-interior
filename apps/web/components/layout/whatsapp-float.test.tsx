import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl, settingsFixture } from "@/test/render";
import { WhatsAppFloat } from "./whatsapp-float";

describe("WhatsAppFloat", () => {
  it("opens a chat on the primary number", () => {
    renderWithIntl(<WhatsAppFloat settings={settingsFixture} />);
    expect(screen.getByRole("link", { name: "Chat on WhatsApp" }))
      .toHaveAttribute("href", "https://wa.me/8801760775454");
  });

  it("is hidden at the top of the home page so it never covers the hero", () => {
    // The mocked pathname is "/", and nothing has scrolled.
    renderWithIntl(<WhatsAppFloat settings={settingsFixture} />);
    const link = screen.getByRole("link", { name: "Chat on WhatsApp" });
    expect(link.className).toContain("opacity-0");
    expect(link.className).toContain("pointer-events-none");
  });

  it("renders nothing when no WhatsApp number is configured", () => {
    const { container } = renderWithIntl(
      <WhatsAppFloat settings={{ ...settingsFixture, whatsapp: "" }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("labels itself in Bangla for bn", () => {
    renderWithIntl(<WhatsAppFloat settings={settingsFixture} />, { locale: "bn" });
    expect(screen.getByRole("link", { name: "হোয়াটসঅ্যাপে বার্তা দিন" })).toBeInTheDocument();
  });

  it("carries a visible label on wide screens as well as the icon", () => {
    renderWithIntl(<WhatsAppFloat settings={settingsFixture} />);
    expect(screen.getByText("Chat on WhatsApp")).toBeInTheDocument();
  });
});
