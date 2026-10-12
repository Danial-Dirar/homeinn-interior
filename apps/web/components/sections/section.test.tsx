import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Section } from "./section";

describe("Section", () => {
  it("marks a dark section as an ink ground, so its accents turn ember", () => {
    const { container } = render(<Section tone="ink" eyebrow="Where we work">x</Section>);
    expect(container.querySelector("section")).toHaveClass("ground-ink");
  });

  it("heads a section with its eyebrow alone, not a numbered 01 / 02 / 03", () => {
    // Numbered sections are a template tell, and with the hidden sections the
    // visible run skipped from 05 to 08.
    const { container } = render(<Section tone="bone" eyebrow="Since 2015">x</Section>);
    expect(container.querySelector(".section-numeral")).toBeNull();
    expect(container).toHaveTextContent("Since 2015");
  });

  it("leaves a light section on the default burnt-orange accent", () => {
    const { container } = render(<Section tone="bone" eyebrow="Since 2015">x</Section>);
    expect(container.querySelector("section")).not.toHaveClass("ground-ink");
  });
});
