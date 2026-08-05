import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HeroSegmentView, MediaView } from "@/lib/api.types";
import { renderWithIntl } from "@/test/render";
import { PanoramaHero } from "./panorama-hero";

function media(id: string): MediaView {
  return {
    id, storageKey: id, mimeType: "image/jpeg",
    width: 1920, height: 1080, bytes: 1000, blurhash: null,
    altEn: `Room ${id}`, altBn: `ঘর ${id}`,
    createdAt: "2026-01-01T00:00:00.000Z",
    sources: [{ type: "image/webp", srcset: `http://cdn/${id}/1920.webp 1920w` }],
  };
}

function segment(index: number, over: Partial<HeroSegmentView> = {}): HeroSegmentView {
  return {
    id: `s${index}`, sortOrder: index,
    labelEn: `Room ${index}`, labelBn: `ঘর ${index}`,
    captionEn: null, captionBn: null,
    focalX: 0.5, active: true, showOnMobile: true,
    image: media(`i${index}`), foreground: null,
    ...over,
  };
}

function setReducedMotion(reduced: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduced && query.includes("reduce"),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

beforeEach(() => setReducedMotion(false));

describe("PanoramaHero", () => {
  it("renders every room label as real text, not baked into an image", () => {
    // Spec §7 accessibility: labels are DOM text.
    renderWithIntl(<PanoramaHero segments={[segment(0), segment(1)]} locale="en" target="desktop" />);
    expect(screen.getByText("Room 0")).toBeInTheDocument();
    expect(screen.getByText("Room 1")).toBeInTheDocument();
  });

  it("uses Bangla labels for bn", () => {
    renderWithIntl(
      <PanoramaHero segments={[segment(0), segment(1)]} locale="bn" target="desktop" />,
      { locale: "bn" },
    );
    expect(screen.getByText("ঘর 0")).toBeInTheDocument();
  });

  it("labels the section for assistive technology", () => {
    renderWithIntl(<PanoramaHero segments={[segment(0), segment(1)]} locale="en" target="desktop" />);
    expect(screen.getByRole("region")).toHaveAccessibleName();
  });

  it("gives the section its scroll distance from the segment count", () => {
    const { container } = renderWithIntl(
      <PanoramaHero segments={[segment(0), segment(1), segment(2)]} locale="en" target="desktop" />);
    expect(container.querySelector("section")).toHaveStyle({ height: "200vh" });
  });

  it("marks the first image as the LCP element and lazies the rest", () => {
    renderWithIntl(
      <PanoramaHero segments={[segment(0), segment(1), segment(2)]} locale="en" target="desktop" />);
    const images = screen.getAllByRole("img");
    expect(images[0]).toHaveAttribute("fetchpriority", "high");
    expect(images[2]).toHaveAttribute("loading", "lazy");
  });

  it("renders a plain vertical stack under prefers-reduced-motion", () => {
    // Spec §7: no pin, no transform — same content, ordinary scroll.
    setReducedMotion(true);
    const { container } = renderWithIntl(
      <PanoramaHero segments={[segment(0), segment(1)]} locale="en" target="desktop" />);
    expect(container.querySelector("[data-hero-strip]")).toBeNull();
    expect(screen.getByText("Room 1")).toBeInTheDocument();
  });

  it("renders a text-only hero when no segments have been published yet", () => {
    renderWithIntl(<PanoramaHero segments={[]} locale="en" target="desktop" />);
    expect(screen.getByText("Interiors built to be lived in")).toBeInTheDocument();
    expect(screen.queryAllByRole("img")).toHaveLength(0);
  });

  it("renders a single segment as a static hero rather than a one-frame pan", () => {
    const { container } = renderWithIntl(
      <PanoramaHero segments={[segment(0)]} locale="en" target="desktop" />);
    expect(container.querySelector("[data-hero-strip]")).toBeNull();
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("offers a skip link past the pinned section", () => {
    renderWithIntl(<PanoramaHero segments={[segment(0), segment(1)]} locale="en" target="desktop" />);
    expect(screen.getByRole("link", { name: "Skip the panorama" }))
      .toHaveAttribute("href", "#after-hero");
  });
});
