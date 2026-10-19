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
    renderWithIntl(<PanoramaHero segments={[segment(0), segment(1)]} locale="en" />);
    expect(screen.getByText("Room 0")).toBeInTheDocument();
    expect(screen.getByText("Room 1")).toBeInTheDocument();
  });

  it("uses Bangla labels for bn", () => {
    renderWithIntl(
      <PanoramaHero segments={[segment(0), segment(1)]} locale="bn" />,
      { locale: "bn" },
    );
    expect(screen.getByText("ঘর 0")).toBeInTheDocument();
  });

  it("labels the section for assistive technology", () => {
    renderWithIntl(<PanoramaHero segments={[segment(0), segment(1)]} locale="en" />);
    expect(screen.getByRole("region")).toHaveAccessibleName();
  });

  it("gives the section its scroll distance from the segment count", () => {
    const { container } = renderWithIntl(
      <PanoramaHero segments={[segment(0), segment(1), segment(2)]} locale="en" />);
    expect(container.querySelector("section")).toHaveStyle({ height: "200vh" });
  });

  it("marks the first image as the LCP element and lazies the rest", () => {
    // Queried from the DOM rather than by role: every room but the active one
    // is `visibility: hidden`, which correctly keeps it out of the
    // accessibility tree.
    const { container } = renderWithIntl(
      <PanoramaHero segments={[segment(0), segment(1), segment(2)]} locale="en" />);
    const images = container.querySelectorAll("img");
    expect(images[0]).toHaveAttribute("fetchpriority", "high");
    expect(images[2]).toHaveAttribute("loading", "lazy");
  });

  it("shows exactly one room to assistive technology at a time", () => {
    renderWithIntl(
      <PanoramaHero segments={[segment(0), segment(1), segment(2)]} locale="en" />);
    expect(screen.getAllByRole("img")).toHaveLength(1);
  });

  it("stacks the rooms rather than laying them out side by side", () => {
    // The old strip put two half-rooms on screen at once, which is the whole
    // reason this became a crossfade.
    const { container } = renderWithIntl(
      <PanoramaHero segments={[segment(0), segment(1)]} locale="en" />);
    const frames = container.querySelectorAll("[data-hero-frame]");
    expect(frames).toHaveLength(2);
    expect(frames[0]).toHaveStyle({ opacity: "1" });
    expect(frames[1]).toHaveStyle({ opacity: "0" });
  });

  it("renders a plain vertical stack under prefers-reduced-motion", () => {
    // Spec §7: no pin, no transform — same content, ordinary scroll.
    setReducedMotion(true);
    const { container } = renderWithIntl(
      <PanoramaHero segments={[segment(0), segment(1)]} locale="en" />);
    expect(container.querySelector("[data-hero-frame]")).toBeNull();
    expect(screen.getByText("Room 1")).toBeInTheDocument();
  });

  it("renders a text-only hero when no segments have been published yet", () => {
    renderWithIntl(<PanoramaHero segments={[]} locale="en" />);
    expect(screen.getByText("Architecture and interiors, built to be lived in")).toBeInTheDocument();
    expect(screen.queryAllByRole("img")).toHaveLength(0);
  });

  it("renders a single segment as a static hero rather than a one-frame pan", () => {
    const { container } = renderWithIntl(
      <PanoramaHero segments={[segment(0)]} locale="en" />);
    expect(container.querySelector("[data-hero-frame]")).toBeNull();
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("sets the scroll cue in light text, so it reads on the dark floor", () => {
    // It inherited the body's charcoal and vanished into the gradient.
    renderWithIntl(<PanoramaHero segments={[segment(0), segment(1)]} locale="en" />);
    expect(screen.getByText("Scroll to walk through").closest(".text-sand")).not.toBeNull();
  });

  it("keeps the photographs dark in the light theme", () => {
    // Captions sit on a dark floor over the photo; flipping it cream would
    // put sand text on cream.
    const { container } = renderWithIntl(
      <PanoramaHero segments={[segment(0), segment(1)]} locale="en" />);
    expect(container.querySelector(".ground-ink")).toHaveClass("ground-photo");
  });

  it("offers a skip link past the pinned section", () => {
    renderWithIntl(<PanoramaHero segments={[segment(0), segment(1)]} locale="en" />);
    expect(screen.getByRole("link", { name: "Skip the panorama" }))
      .toHaveAttribute("href", "#after-hero");
  });
});

describe("PanoramaHero on a phone", () => {
  function setMobile(mobile: boolean) {
    vi.stubGlobal("matchMedia", (query: string) => ({
      // reduced-motion off, but max-width matches when we say it does.
      matches: query.includes("max-width") ? mobile : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  }

  it("uses the curated mobile strip when there is one", () => {
    setMobile(true);
    renderWithIntl(
      <PanoramaHero
        segments={[segment(0), segment(1), segment(2), segment(3)]}
        mobileSegments={[segment(0), segment(1)]}
        locale="en"
      />);
    // A screen to rest on, then 120vh per room for its pan and handover.
    expect(screen.getByRole("region")).toHaveStyle({ height: "340vh" });
  });

  it("lets each photograph keep its own shape, wider than the phone, so the camera can pan across the room", () => {
    setMobile(true);
    const { container } = renderWithIntl(
      <PanoramaHero segments={[segment(0), segment(1)]} mobileSegments={[segment(0), segment(1)]} locale="en" />);
    const pans = container.querySelectorAll<HTMLElement>("[data-hero-pan]");
    expect(pans).toHaveLength(2);
    expect(pans[0]!.style.aspectRatio).toBe("1920 / 1080");
  });

  it("opens on the first room in place, with the next waiting below the screen to rise", () => {
    setMobile(true);
    const { container } = renderWithIntl(
      <PanoramaHero segments={[segment(0), segment(1)]} mobileSegments={[segment(0), segment(1)]} locale="en" />);
    const frames = container.querySelectorAll<HTMLElement>("[data-hero-frame]");
    expect(frames[0]!.style.transform).toContain("translate3d(0px, 0%, 0px)");
    expect(frames[1]!.style.transform).toContain("translate3d(0px, 100%, 0px)");
  });

  it("names one room at a time, the rest masked away", () => {
    setMobile(true);
    renderWithIntl(
      <PanoramaHero segments={[segment(0), segment(1)]} mobileSegments={[segment(0), segment(1)]} locale="en" />);
    expect(screen.getByText("Room 0").closest("[data-hero-label]")).not.toHaveAttribute("aria-hidden");
    expect(screen.getByText("Room 1").closest("[data-hero-label]")).toHaveAttribute("aria-hidden", "true");
  });

  it("shows how far along the rooms it is, one mark per room", () => {
    setMobile(true);
    const { container } = renderWithIntl(
      <PanoramaHero segments={[segment(0), segment(1), segment(2)]} mobileSegments={[]} locale="en" />);
    expect(container.querySelectorAll("[data-hero-progress] > *")).toHaveLength(3);
  });

  it("falls back to the full strip when the CMS flagged none for mobile", () => {
    setMobile(true);
    const { container } = renderWithIntl(
      <PanoramaHero segments={[segment(0), segment(1), segment(2)]} mobileSegments={[]} locale="en" />);
    expect(container.querySelectorAll("[data-hero-frame]")).toHaveLength(3);
  });

  it("uses the full strip on a desktop viewport", () => {
    setMobile(false);
    const { container } = renderWithIntl(
      <PanoramaHero
        segments={[segment(0), segment(1), segment(2)]}
        mobileSegments={[segment(0)]}
        locale="en"
      />);
    expect(container.querySelectorAll("[data-hero-frame]")).toHaveLength(3);
  });
});
