import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl, settingsFixture } from "@/test/render";
import { Statement } from "./statement";

describe("Statement", () => {
  it("shows the three headline counts from settings", () => {
    // Spec §12: only stats that trace to the profile document.
    renderWithIntl(<Statement locale="en" settings={settingsFixture} />);
    expect(screen.getByText("73")).toBeInTheDocument();
    expect(screen.getByText("57")).toBeInTheDocument();
    expect(screen.getByText("13")).toBeInTheDocument();
  });

  it("labels each count", () => {
    renderWithIntl(<Statement locale="en" settings={settingsFixture} />);
    expect(screen.getByText("corporate projects")).toBeInTheDocument();
    expect(screen.getByText("residential projects")).toBeInTheDocument();
    expect(screen.getByText("districts")).toBeInTheDocument();
  });

  it("never claims clients where the source says projects", () => {
    // Spec §2's counting rule: the corporate list repeats clients across sites.
    renderWithIntl(<Statement locale="en" settings={settingsFixture} />);
    expect(screen.queryByText(/corporate clients/i)).not.toBeInTheDocument();
  });
});
