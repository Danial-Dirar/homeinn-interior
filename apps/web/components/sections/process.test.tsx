import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { Process } from "./process";

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }));
  vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
});

describe("Process", () => {
  it("shows plan, model and render, in that order", () => {
    renderWithIntl(<Process />);
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent))
      .toEqual(["Plan", "Model", "Render"]);
  });

  it("draws the plan as a labelled blueprint", () => {
    renderWithIntl(<Process />);
    expect(screen.getByRole("img", { name: /Ground-floor plan/ })).toBeInTheDocument();
  });

  it("calls the render a render, so it is never taken for a photograph", () => {
    renderWithIntl(<Process />);
    expect(screen.getByAltText(/^3D render:/)).toHaveAttribute("src", "/process/render-1600.webp");
  });

  it("serves the model and render at more than one width", () => {
    renderWithIntl(<Process />);
    expect(screen.getByAltText(/3D massing model/)).toHaveAttribute("srcset", "/process/model-640.webp 640w, /process/model-1280.webp 1280w");
  });

  it("speaks Bangla on bn pages", () => {
    renderWithIntl(<Process />, { locale: "bn" });
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent))
      .toEqual(["প্ল্যান", "মডেল", "রেন্ডার"]);
    expect(screen.getByAltText(/^৩ডি রেন্ডার:/)).toBeInTheDocument();
  });
});
