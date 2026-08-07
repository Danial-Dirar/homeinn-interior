import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ProjectView } from "@/lib/api.types";
import { renderWithIntl } from "@/test/render";
import { SelectedProjects } from "./selected-projects";

function project(over: Partial<ProjectView> = {}): ProjectView {
  return {
    id: "p1", slug: "bfidc-head-office",
    titleEn: "BFIDC Head Office", titleBn: "বিএফআইডিসি প্রধান কার্যালয়",
    clientName: null,
    locationEn: "Dhaka", locationBn: "ঢাকা",
    areaSqft: 4200, year: 2024,
    descriptionEn: "<p>x</p>", descriptionBn: "<p>x</p>",
    workingAreaId: "w1", featured: true, published: true, sortOrder: 0, cover: null,
    ...over,
  };
}

describe("SelectedProjects", () => {
  it("renders nothing at all when no case studies are published", () => {
    // Spec §12: project case studies stay unpublished until the client confirms
    // the details, so the section must disappear rather than show an empty grid.
    const { container } = renderWithIntl(<SelectedProjects locale="en" projects={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows at most four", () => {
    const many = Array.from({ length: 7 }, (_, i) => project({ id: `p${i}`, slug: `p-${i}` }));
    renderWithIntl(<SelectedProjects locale="en" projects={many} />);
    expect(screen.getAllByRole("article")).toHaveLength(4);
  });

  it("links each card to its case study", () => {
    renderWithIntl(<SelectedProjects locale="en" projects={[project()]} />);
    expect(screen.getByRole("link", { name: /BFIDC Head Office/ }))
      .toHaveAttribute("href", "/en/projects/bfidc-head-office");
  });

  it("shows the location and year", () => {
    renderWithIntl(<SelectedProjects locale="en" projects={[project()]} />);
    expect(screen.getByText(/Dhaka/)).toBeInTheDocument();
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });
});
