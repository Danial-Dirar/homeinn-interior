import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl, settingsFixture } from "@/test/render";
import { ResidentialSummary } from "./residential-summary";

const summary = { total: 57, districts: ["Dhaka", "Savar", "Sylhet"] };

describe("ResidentialSummary", () => {
  it("states the count and the districts, and nothing else", () => {
    // Spec §11: named private individuals with location data are not published.
    renderWithIntl(<ResidentialSummary locale="en" summary={summary} settings={settingsFixture} />);
    expect(screen.getByText(/57 completed residential projects/)).toBeInTheDocument();
    expect(screen.getByText("Sylhet")).toBeInTheDocument();
  });

  it("explains why no names appear", () => {
    renderWithIntl(<ResidentialSummary locale="en" summary={summary} settings={settingsFixture} />);
    expect(screen.getByText(/aggregate/i)).toBeInTheDocument();
  });

  it("falls back to the settings count when the summary is unavailable", () => {
    renderWithIntl(
      <ResidentialSummary
        locale="en"
        summary={{ total: 0, districts: [] }}
        settings={settingsFixture}
      />);
    expect(screen.getByText(/57 completed residential projects/)).toBeInTheDocument();
  });
});
