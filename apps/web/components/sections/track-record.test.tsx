import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CorporateClientView } from "@/lib/api.types";
import { renderWithIntl, settingsFixture } from "@/test/render";
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
  it("still states the real counts when the client table is empty", () => {
    // The 73/57/13 figures are in spec §2; the row-level tables are blocked on
    // the profile PDF. The section must stay truthful without them.
    renderWithIntl(<TrackRecord locale="en" settings={settingsFixture} clients={[]} />);
    expect(screen.getByText(/73/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /See the full track record/ }))
      .toHaveAttribute("href", "/en/clients");
  });

  it("surfaces only the flagship references when rows exist", () => {
    renderWithIntl(
      <TrackRecord locale="en" settings={settingsFixture} clients={[flagship, ordinary]} />);
    expect(screen.getAllByText("BFIDC").length).toBeGreaterThan(0);
    expect(screen.queryByText("Some Company Ltd")).not.toBeInTheDocument();
  });

  it("falls back to the counts when rows exist but none are flagged", () => {
    renderWithIntl(<TrackRecord locale="en" settings={settingsFixture} clients={[ordinary]} />);
    expect(screen.queryByText("Some Company Ltd")).not.toBeInTheDocument();
    expect(screen.getByText(/73/)).toBeInTheDocument();
  });
});
