import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MediaView } from "@/lib/api.types";
import { Picture } from "./picture";

const media: MediaView = {
  id: "m1", storageKey: "abc", mimeType: "image/jpeg",
  width: 1920, height: 1080, bytes: 1000, blurhash: null,
  altEn: "A living room", altBn: "একটি বসার ঘর",
  createdAt: "2026-01-01T00:00:00.000Z",
  sources: [
    { type: "image/avif", srcset: "http://cdn/abc/480.avif 480w, http://cdn/abc/1920.avif 1920w" },
    { type: "image/webp", srcset: "http://cdn/abc/480.webp 480w, http://cdn/abc/1920.webp 1920w" },
  ],
};

describe("Picture", () => {
  it("uses the locale's alt text", () => {
    render(<Picture media={media} locale="bn" sizes="100vw" />);
    expect(screen.getByAltText("একটি বসার ঘর")).toBeInTheDocument();
  });

  it("emits one <source> per format, avif first", () => {
    const { container } = render(<Picture media={media} locale="en" sizes="100vw" />);
    const types = [...container.querySelectorAll("source")].map((s) => s.getAttribute("type"));
    expect(types).toEqual(["image/avif", "image/webp"]);
  });

  it("falls back to the widest webp on the <img>", () => {
    render(<Picture media={media} locale="en" sizes="100vw" />);
    expect(screen.getByRole("img")).toHaveAttribute("src", "http://cdn/abc/1920.webp");
  });

  it("carries intrinsic dimensions so nothing shifts on load", () => {
    render(<Picture media={media} locale="en" sizes="100vw" />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("width", "1920");
    expect(img).toHaveAttribute("height", "1080");
  });

  it("lazy-loads by default and eager-loads when priority is set", () => {
    const { rerender } = render(<Picture media={media} locale="en" sizes="100vw" />);
    expect(screen.getByRole("img")).toHaveAttribute("loading", "lazy");

    rerender(<Picture media={media} locale="en" sizes="100vw" priority />);
    expect(screen.getByRole("img")).toHaveAttribute("loading", "eager");
    expect(screen.getByRole("img")).toHaveAttribute("fetchpriority", "high");
  });
});
