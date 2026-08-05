import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { WorkingAreaView } from "@/lib/api.types";
import { renderWithIntl } from "@/test/render";
import { WorkingAreas } from "./working-areas";

const areas: WorkingAreaView[] = [
  { id: "w1", slug: "corporate-office-bank-furniture", nameEn: "Corporate Office & Bank Furniture", nameBn: "কর্পোরেট অফিস ও ব্যাংক ফার্নিচার", sortOrder: 0 },
  { id: "w2", slug: "landscaping", nameEn: "Landscaping", nameBn: "ল্যান্ডস্কেপিং", sortOrder: 1 },
];

describe("WorkingAreas", () => {
  it("links each area into the filtered project grid", () => {
    renderWithIntl(<WorkingAreas locale="en" areas={areas} />);
    expect(screen.getByRole("link", { name: "Landscaping" }))
      .toHaveAttribute("href", "/en/projects?area=landscaping");
  });

  it("numbers the areas", () => {
    renderWithIntl(<WorkingAreas locale="en" areas={areas} />);
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
  });

  it("renders Bangla names for bn", () => {
    renderWithIntl(<WorkingAreas locale="bn" areas={areas} />, { locale: "bn" });
    expect(screen.getByText("ল্যান্ডস্কেপিং")).toBeInTheDocument();
  });
});
