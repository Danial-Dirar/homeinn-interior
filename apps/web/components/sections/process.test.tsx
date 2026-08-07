import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import { Process } from "./process";

function renderWith(messages: Record<string, unknown>) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <Process />
    </NextIntlClientProvider>,
  );
}

describe("Process", () => {
  it("renders nothing while the copy source is missing", () => {
    // home.processTitle is empty in both catalogues: its source is the profile
    // PDF's six key strengths, which is not in this repository (spec §12).
    const { container } = renderWith(en);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders once the copy is written", () => {
    renderWith({ ...en, home: { ...en.home, processTitle: "Six steps, every time." } });
    expect(screen.getByText("Six steps, every time.")).toBeInTheDocument();
  });
});
