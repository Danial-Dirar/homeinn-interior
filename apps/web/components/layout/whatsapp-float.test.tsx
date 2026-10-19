import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithIntl, settingsFixture } from "@/test/render";
import { WhatsAppFloat } from "./whatsapp-float";

describe("WhatsAppFloat", () => {
  it("opens a chat on the number that answers, not merely the first line", () => {
    renderWithIntl(<WhatsAppFloat settings={settingsFixture} />);
    expect(screen.getByRole("link", { name: "Chat on WhatsApp" }))
      .toHaveAttribute("href", "https://wa.me/8801818843999");
  });

  it("is hidden at the top of the home page so it never covers the hero", () => {
    // The mocked pathname is "/", and nothing has scrolled.
    renderWithIntl(<WhatsAppFloat settings={settingsFixture} />);
    const link = screen.getByRole("link", { name: "Chat on WhatsApp" });
    expect(link.className).toContain("opacity-0");
    expect(link.className).toContain("pointer-events-none");
  });

  describe("over the pinned hero", () => {
    function heroEndsAt(top: number) {
      const marker = document.createElement("div");
      marker.id = "after-hero";
      marker.getBoundingClientRect = () => ({ top } as DOMRect);
      document.body.appendChild(marker);
      Object.defineProperty(window, "scrollY", { value: 900, configurable: true });
    }
    afterEach(() => {
      document.getElementById("after-hero")?.remove();
      Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
    });

    it("stays hidden while the hero is still on screen, however far into it the visitor has scrolled", () => {
      // On a phone the hero is several screens of scroll; at 300px the button
      // used to appear on top of the rooms' names.
      heroEndsAt(1500);
      renderWithIntl(<WhatsAppFloat settings={settingsFixture} />);
      expect(screen.getByRole("link", { name: "Chat on WhatsApp" }).className).toContain("opacity-0");
    });

    it("appears once the hero has scrolled away", () => {
      heroEndsAt(100);
      renderWithIntl(<WhatsAppFloat settings={settingsFixture} />);
      expect(screen.getByRole("link", { name: "Chat on WhatsApp" }).className).toContain("opacity-100");
    });
  });

  it("renders nothing when no line answers on WhatsApp", () => {
    // Both lines have to go: the second falls back to its own number.
    const none = {
      ...settingsFixture,
      whatsapp: "",
      phoneSecondary: null,
      whatsappSecondary: null,
    };
    const { container } = renderWithIntl(<WhatsAppFloat settings={none} />);
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
