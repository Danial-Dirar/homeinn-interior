import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import { CopyBlock } from "./copy-block";

describe("CopyBlock", () => {
  it("renders a heading and body when both are written", () => {
    renderWithIntl(<CopyBlock title="Vision" body="To build well." />);
    expect(screen.getByRole("heading", { name: "Vision" })).toBeInTheDocument();
    expect(screen.getByText("To build well.")).toBeInTheDocument();
  });

  it("renders nothing when the body is blank", () => {
    // Vision / Mission / Values / Strengths / Philosophy exist verbatim in the
    // company profile PDF, which is not in this repository. Spec §12 forbids
    // writing substitutes, so the block disappears until the copy lands.
    const { container } = renderWithIntl(<CopyBlock title="Vision" body="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for whitespace", () => {
    const { container } = renderWithIntl(<CopyBlock title="Vision" body="   " />);
    expect(container).toBeEmptyDOMElement();
  });
});
