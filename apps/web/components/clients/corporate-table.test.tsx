import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CorporateClientView } from "@/lib/api.types";
import { renderWithIntl } from "@/test/render";
import { CorporateTable } from "./corporate-table";

const rows: CorporateClientView[] = [
  { id: "c1", serial: 1, companyName: "BFIDC", address: "Dhaka", isFlagship: true, needsVerification: false },
  { id: "c2", serial: 2, companyName: "Woodora Furniture Ltd.", address: "Savar", isFlagship: true, needsVerification: false },
];

describe("CorporateTable", () => {
  it("lists company names and addresses", () => {
    renderWithIntl(<CorporateTable locale="en" clients={rows} />);
    expect(screen.getByText("BFIDC")).toBeInTheDocument();
    expect(screen.getByText("Savar")).toBeInTheDocument();
  });

  it("preserves the profile's own ordering", () => {
    renderWithIntl(<CorporateTable locale="en" clients={[rows[1]!, rows[0]!]} />);
    expect(screen.getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual(["1", "2"]);
  });

  it("explains the empty state rather than showing a bare table", () => {
    // The 73 rows are blocked on the company profile PDF.
    renderWithIntl(<CorporateTable locale="en" clients={[]} />);
    expect(screen.getByText(/being prepared for publication/)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
