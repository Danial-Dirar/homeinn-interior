import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { WorkingAreaView } from "@/lib/api.types";
import { renderWithIntl } from "@/test/render";
import { ProjectFilterBar } from "./project-filter-bar";

const areas: WorkingAreaView[] = [
  { id: "w1", slug: "landscaping", nameEn: "Landscaping", nameBn: "ল্যান্ডস্কেপিং", sortOrder: 0 },
  { id: "w2", slug: "gypsum-work", nameEn: "Gypsum Work", nameBn: "জিপসাম ওয়ার্ক", sortOrder: 1 },
];

describe("ProjectFilterBar", () => {
  it("offers an all-projects option plus every area", () => {
    renderWithIntl(<ProjectFilterBar locale="en" areas={areas} active={undefined} />);
    expect(screen.getByRole("link", { name: "All projects" })).toHaveAttribute("href", "/en/projects");
    expect(screen.getByRole("link", { name: "Landscaping" }))
      .toHaveAttribute("href", "/en/projects?area=landscaping");
  });

  it("marks the active filter for assistive technology", () => {
    renderWithIntl(<ProjectFilterBar locale="en" areas={areas} active="landscaping" />);
    expect(screen.getByRole("link", { name: "Landscaping" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "Gypsum Work" })).not.toHaveAttribute("aria-current");
  });

  it("marks all-projects active when nothing is filtered", () => {
    renderWithIntl(<ProjectFilterBar locale="en" areas={areas} active={undefined} />);
    expect(screen.getByRole("link", { name: "All projects" })).toHaveAttribute("aria-current", "true");
  });

  it("names the filter group", () => {
    renderWithIntl(<ProjectFilterBar locale="en" areas={areas} active={undefined} />);
    expect(screen.getByRole("navigation", { name: "Filter by working area" })).toBeInTheDocument();
  });
});
