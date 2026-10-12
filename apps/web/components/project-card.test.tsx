import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ProjectView } from "@/lib/api.types";
import { renderWithIntl } from "@/test/render";
import { ProjectCard } from "./project-card";

function project(over: Partial<ProjectView> = {}): ProjectView {
  return {
    id: "p1", slug: "brick-screen-villa",
    titleEn: "Brick-Screen Villa", titleBn: "ইটের জালির ভিলা",
    clientName: null,
    locationEn: "", locationBn: "",
    areaSqft: null, year: null,
    descriptionEn: "<p>x</p>", descriptionBn: "<p>x</p>",
    workingAreaId: "w1", workingArea: { slug: "architectural-design" },
    featured: true, published: true, sortOrder: 0, cover: null,
    ...over,
  };
}

describe("ProjectCard", () => {
  it("marks a design as a 3D render where the picture is, not only in its alt text", () => {
    // Spec: a render is never presented as a photograph of a built place. The
    // villas sit beside photographs of finished offices in the same grid.
    renderWithIntl(<ProjectCard locale="en" project={project()} />);
    expect(screen.getByText("3D render")).toBeInTheDocument();
  });

  it("marks it in Bangla on the Bangla site", () => {
    renderWithIntl(<ProjectCard locale="bn" project={project()} />, { locale: "bn" });
    expect(screen.getByText("৩ডি রেন্ডার")).toBeInTheDocument();
  });

  it("leaves built work unmarked", () => {
    renderWithIntl(
      <ProjectCard locale="en" project={project({ workingArea: { slug: "corporate-office" } })} />,
    );
    expect(screen.queryByText("3D render")).not.toBeInTheDocument();
  });

  it("still renders from an API built before the working area was sent", () => {
    // The web and the API restart separately. A card that throws takes the
    // whole home page down with it; a card without its tag does not.
    const older = project();
    delete older.workingArea;
    renderWithIntl(<ProjectCard locale="en" project={older} />);
    expect(screen.getByRole("link", { name: /Brick-Screen Villa/ })).toBeInTheDocument();
  });
});
