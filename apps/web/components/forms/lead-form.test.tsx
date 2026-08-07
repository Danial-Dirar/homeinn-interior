import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { LeadForm } from "./lead-form";

function stubFetch(status: number) {
  const spy = vi.fn(async (...args: unknown[]) => ({
    ok: status < 400,
    status,
    json: async () => ({}),
    args,
  }));
  vi.stubGlobal("fetch", spy);
  return spy;
}

afterEach(() => vi.unstubAllGlobals());

async function fillAndSubmit(phone: string) {
  await userEvent.type(screen.getByLabelText(/Your name/), "Rahim");
  await userEvent.type(screen.getByLabelText(/Mobile number/), phone);
  await userEvent.click(screen.getByRole("button", { name: "Send enquiry" }));
}

describe("LeadForm", () => {
  it("submits name, phone and type", async () => {
    const spy = stubFetch(201);
    renderWithIntl(<LeadForm locale="en" services={[]} sourcePath="/en" />);
    await fillAndSubmit("01760775454");

    await waitFor(() => expect(spy).toHaveBeenCalled());
    const body = JSON.parse((spy.mock.calls[0]?.[1] as RequestInit).body as string);
    expect(body).toMatchObject({
      name: "Rahim", phone: "01760775454", locale: "en", sourcePath: "/en",
    });
  });

  it("shows a success message and clears the form", async () => {
    stubFetch(201);
    renderWithIntl(<LeadForm locale="en" services={[]} sourcePath="/en" />);
    await fillAndSubmit("01760775454");

    expect(await screen.findByText(/Thank you/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Your name/)).toHaveValue("");
  });

  it("rejects a bad phone number in the browser, before the request", async () => {
    const spy = stubFetch(201);
    renderWithIntl(<LeadForm locale="en" services={[]} sourcePath="/en" />);
    await fillAndSubmit("12345");

    expect(await screen.findByText(/valid Bangladeshi mobile number/)).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  it("explains a throttled submission instead of blaming the visitor", async () => {
    stubFetch(429);
    renderWithIntl(<LeadForm locale="en" services={[]} sourcePath="/en" />);
    await fillAndSubmit("01760775454");

    expect(await screen.findByText(/several enquiries from this connection/)).toBeInTheDocument();
  });

  it("announces its status to assistive technology", () => {
    renderWithIntl(<LeadForm locale="en" services={[]} sourcePath="/en" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders its labels in Bangla for bn", () => {
    renderWithIntl(<LeadForm locale="bn" services={[]} sourcePath="/bn" />, { locale: "bn" });
    expect(screen.getByLabelText(/আপনার নাম/)).toBeInTheDocument();
  });
});
