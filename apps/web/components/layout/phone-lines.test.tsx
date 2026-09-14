import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl, settingsFixture } from "@/test/render";
import { PhoneLines, companyWhatsapp, phoneLines } from "./phone-lines";

describe("phoneLines", () => {
  it("returns both numbers when a second one is configured", () => {
    expect(phoneLines(settingsFixture).map((l) => l.phone))
      .toEqual(["01760775454", "01818843999"]);
  });

  it("returns one when there is no second line", () => {
    const single = { ...settingsFixture, phoneSecondary: null, whatsappSecondary: null };
    expect(phoneLines(single)).toHaveLength(1);
  });

  it("ignores a blank second line rather than showing an empty row", () => {
    expect(phoneLines({ ...settingsFixture, phoneSecondary: "   " })).toHaveLength(1);
  });

  it("falls back to the number itself when no separate WhatsApp is given", () => {
    const noWa = { ...settingsFixture, whatsappSecondary: null };
    expect(phoneLines(noWa)[1]?.whatsapp).toBe("01818843999");
  });

  it("leaves a line without WhatsApp when none is configured for it", () => {
    expect(phoneLines(settingsFixture)[0]?.whatsapp).toBeNull();
  });
});

describe("companyWhatsapp", () => {
  it("finds the line that answers, even when it is not the first", () => {
    expect(companyWhatsapp(settingsFixture)).toBe("+8801818843999");
  });

  it("is null when no line answers on WhatsApp", () => {
    const none = {
      ...settingsFixture,
      whatsapp: "",
      phoneSecondary: null,
      whatsappSecondary: null,
    };
    expect(companyWhatsapp(none)).toBeNull();
  });
});

describe("PhoneLines", () => {
  it("renders both numbers as callable links", () => {
    renderWithIntl(<PhoneLines settings={settingsFixture} />);
    expect(screen.getByRole("link", { name: "01760775454" }))
      .toHaveAttribute("href", "tel:01760775454");
    expect(screen.getByRole("link", { name: "01818843999" }))
      .toHaveAttribute("href", "tel:01818843999");
  });

  it("shows WhatsApp beside the number that answers there, and not the other", () => {
    renderWithIntl(<PhoneLines settings={settingsFixture} />);
    expect(screen.getByRole("link", { name: /Chat on WhatsApp — 01818843999/ }))
      .toHaveAttribute("href", "https://wa.me/8801818843999");
    // An icon beside a number that does not answer on WhatsApp would send
    // people to a dead chat, so the first line carries none.
    expect(screen.queryByRole("link", { name: /Chat on WhatsApp — 01760775454/ }))
      .toBeNull();
  });

  it("names the links per number when more than one answers", () => {
    const both = { ...settingsFixture, whatsapp: "+8801760775454" };
    renderWithIntl(<PhoneLines settings={both} />);
    const names = screen
      .getAllByRole("link", { name: /Chat on WhatsApp/ })
      .map((link) => link.getAttribute("aria-label"));
    expect(new Set(names).size).toBe(2);
  });

  it("labels them in Bangla for bn", () => {
    renderWithIntl(<PhoneLines settings={settingsFixture} />, { locale: "bn" });
    expect(screen.getAllByRole("link", { name: /হোয়াটসঅ্যাপে বার্তা দিন/ })).toHaveLength(1);
  });
});
