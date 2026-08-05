import { describe, expect, it } from "vitest";
import { whatsappHref } from "./whatsapp";

describe("whatsappHref", () => {
  it("strips everything that is not a digit", () => {
    expect(whatsappHref("+880 1760-775454")).toBe("https://wa.me/8801760775454");
  });

  it("expands a local 01… number to the country code", () => {
    expect(whatsappHref("01760775454")).toBe("https://wa.me/8801760775454");
  });

  it("url-encodes a prefilled message", () => {
    expect(whatsappHref("01760775454", "Hello Home Inn"))
      .toBe("https://wa.me/8801760775454?text=Hello%20Home%20Inn");
  });
});
