import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ServiceView } from "@/lib/api.types";
import { renderWithIntl } from "@/test/render";
import { ServicesGrid } from "./services-grid";

function service(over: Partial<ServiceView> = {}): ServiceView {
  return {
    id: "s1", slug: "interior-design-implementation",
    titleEn: "Interior Design & Implementation", titleBn: "ইন্টেরিয়র ডিজাইন ও বাস্তবায়ন",
    summaryEn: "From drawing to finished space.", summaryBn: "ড্রয়িং থেকে সম্পূর্ণ কাজ।",
    bodyEn: "<p>x</p>", bodyBn: "<p>x</p>",
    icon: "paintbrush", sortOrder: 0, published: true, cover: null,
    ...over,
  };
}

describe("ServicesGrid", () => {
  it("links each service to its detail page", () => {
    renderWithIntl(<ServicesGrid locale="en" services={[service()]} />);
    expect(screen.getByRole("link", { name: /Interior Design/ }))
      .toHaveAttribute("href", "/en/services/interior-design-implementation");
  });

  it("shows Bangla titles and summaries for bn", () => {
    renderWithIntl(<ServicesGrid locale="bn" services={[service()]} />, { locale: "bn" });
    expect(screen.getByText("ইন্টেরিয়র ডিজাইন ও বাস্তবায়ন")).toBeInTheDocument();
    expect(screen.getByText("ড্রয়িং থেকে সম্পূর্ণ কাজ।")).toBeInTheDocument();
  });

  it("renders an empty-state message rather than an empty grid", () => {
    renderWithIntl(<ServicesGrid locale="en" services={[]} />);
    expect(screen.getByText(/Services are being published/)).toBeInTheDocument();
  });

  it("hides decorative icons from assistive technology", () => {
    const { container } = renderWithIntl(<ServicesGrid locale="en" services={[service()]} />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
