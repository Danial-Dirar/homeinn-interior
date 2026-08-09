import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ClientLogoView, MediaView } from "@/lib/api.types";
import { renderWithIntl } from "@/test/render";
import { ClientLogoWall } from "./client-logo-wall";

function logo(name: string, website: string | null = "https://example.com"): ClientLogoView {
  const media: MediaView = {
    id: name, storageKey: name, mimeType: "image/webp",
    width: 400, height: 200, bytes: 5000, blurhash: null,
    altEn: name, altBn: name,
    createdAt: "2026-01-01T00:00:00.000Z",
    sources: [{ type: "image/webp", srcset: `http://cdn/${name}/400.webp 400w` }],
  };
  return { id: name, name, website, sortOrder: 0, logo: media };
}

const five = ["foodpanda", "HATIL", "OTOBI", "HNC", "LEC"].map((n) => logo(n));

describe("ClientLogoWall", () => {
  it("renders nothing when there are no logos", () => {
    const { container } = renderWithIntl(<ClientLogoWall locale="en" clients={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("names each logo, so the mark is not the only cue", () => {
    renderWithIntl(<ClientLogoWall locale="en" clients={five} />);
    // Duplicated by the marquee track, hence getAllByLabelText.
    expect(screen.getAllByLabelText("HATIL").length).toBeGreaterThan(0);
  });

  it("links a logo to the client's site, opened safely", () => {
    renderWithIntl(<ClientLogoWall locale="en" clients={five} />);
    const link = screen.getAllByLabelText("OTOBI")[0]!;
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("rel", "noreferrer noopener");
  });

  it("still shows a logo that has no website, without a dead link", () => {
    renderWithIntl(<ClientLogoWall locale="en" clients={[logo("Quiet Co", null)]} />);
    expect(screen.queryByRole("link", { name: "Quiet Co" })).not.toBeInTheDocument();
    expect(screen.getByAltText("Quiet Co")).toBeInTheDocument();
  });

  it("scrolls once there are enough logos to fill a row", () => {
    const { container } = renderWithIntl(<ClientLogoWall locale="en" clients={five} />);
    expect(container.querySelectorAll("[data-marquee-track]")).toHaveLength(2);
  });

  it("lays a short list out plainly instead of looping three marks forever", () => {
    const { container } = renderWithIntl(
      <ClientLogoWall locale="en" clients={five.slice(0, 3)} />);
    expect(container.querySelectorAll("[data-marquee-track]")).toHaveLength(0);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("slows the loop as the list grows, so the pace stays even", () => {
    const { container: small } = renderWithIntl(<ClientLogoWall locale="en" clients={five} />);
    const { container: big } = renderWithIntl(
      <ClientLogoWall locale="en" clients={[...five, ...five.map((c) => ({ ...c, id: `${c.id}2` }))]} />);
    const read = (c: HTMLElement) =>
      Number((c.querySelector("[style*='--marquee-duration']") as HTMLElement)
        ?.style.getPropertyValue("--marquee-duration").replace("s", ""));
    expect(read(big)).toBeGreaterThan(read(small));
  });
});
