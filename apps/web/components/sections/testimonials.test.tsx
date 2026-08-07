import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TestimonialView } from "@/lib/api.types";
import { renderWithIntl } from "@/test/render";
import { Testimonials } from "./testimonials";

const quote: TestimonialView = {
  id: "t1", authorName: "A Client",
  roleEn: "Managing Director", roleBn: "ব্যবস্থাপনা পরিচালক",
  quoteEn: "They finished on time.", quoteBn: "তাঁরা সময়মতো শেষ করেছেন।",
  rating: 5, avatar: null, sortOrder: 0,
};

describe("Testimonials", () => {
  it("renders nothing when there are none", () => {
    // Spec §12: no invented quotes, no stock-photo customers. The table seeds
    // empty and the section does not render.
    const { container } = renderWithIntl(<Testimonials locale="en" testimonials={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders real quotes when they exist", () => {
    renderWithIntl(<Testimonials locale="en" testimonials={[quote]} />);
    expect(screen.getByText(/They finished on time/)).toBeInTheDocument();
    expect(screen.getByText("A Client")).toBeInTheDocument();
  });
});
