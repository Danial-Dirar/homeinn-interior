import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CertificationView } from "@/lib/api.types";
import { renderWithIntl } from "@/test/render";
import { Credentials } from "./credentials";

const vat: CertificationView = {
  id: "c1", titleEn: "VAT Registration", titleBn: "ভ্যাট নিবন্ধন",
  issuer: "National Board of Revenue", reference: "BIN 001489494-0804",
  document: null, sortOrder: 1,
};

describe("Credentials", () => {
  it("shows the credential, its issuer and its reference", () => {
    renderWithIntl(<Credentials locale="en" certifications={[vat]} />);
    expect(screen.getByText("VAT Registration")).toBeInTheDocument();
    expect(screen.getByText(/National Board of Revenue/)).toBeInTheDocument();
    expect(screen.getByText(/BIN 001489494-0804/)).toBeInTheDocument();
  });

  it("renders nothing when none are recorded", () => {
    const { container } = renderWithIntl(<Credentials locale="en" certifications={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
