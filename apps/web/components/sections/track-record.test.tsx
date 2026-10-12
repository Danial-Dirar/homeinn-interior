import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CorporateClientView } from "@/lib/api.types";
import { renderWithIntl } from "@/test/render";
import { TrackRecord } from "./track-record";

const flagship: CorporateClientView = {
  id: "c1", serial: 1, companyName: "BFIDC", address: "Dhaka",
  isFlagship: true, needsVerification: false,
};
const ordinary: CorporateClientView = {
  id: "c2", serial: 2, companyName: "Some Company Ltd", address: "Dhaka",
  isFlagship: false, needsVerification: false,
};

describe("TrackRecord", () => {
  it("leads to the full track record when the client table is empty", () => {
    // The row-level tables are blocked on the profile PDF; the section must
    // still say something true and point onward.
    renderWithIntl(<TrackRecord clients={[]} />);
    expect(screen.getByRole("link", { name: /See the full track record/ }))
      .toHaveAttribute("href", "/en/clients");
  });

  it("does not repeat the headline figures as a sum", () => {
    // The statement above already says them in a sentence; "73 + 57" in large
    // type was the same dashboard trope again.
    renderWithIntl(<TrackRecord clients={[]} />);
    expect(screen.queryByText(/73/)).not.toBeInTheDocument();
  });

  it("surfaces only the flagship references when rows exist", () => {
    renderWithIntl(
      <TrackRecord clients={[flagship, ordinary]} />);
    expect(screen.getAllByText("BFIDC").length).toBeGreaterThan(0);
    expect(screen.queryByText("Some Company Ltd")).not.toBeInTheDocument();
  });

  it("shows no names when rows exist but none are flagged", () => {
    renderWithIntl(<TrackRecord clients={[ordinary]} />);
    expect(screen.queryByText("Some Company Ltd")).not.toBeInTheDocument();
  });
});
