import { expect, test } from "@playwright/test";

/** A different number per run keeps repeat runs from looking like one visitor. */
function phone(): string {
  return `017${Math.floor(10000000 + Math.random() * 89999999)}`;
}

for (const locale of ["en", "bn"] as const) {
  test(`a visitor can submit an enquiry in ${locale}`, async ({ page }, testInfo) => {
    // POST /api/leads is capped at 5/hour/IP and every project shares this
    // machine's IP. Running the flow once per locale is the coverage; running
    // it again per browser would just exhaust the budget and 429.
    test.skip(testInfo.project.name !== "desktop", "one browser is enough for this flow");
    await page.goto(`/${locale}/contact`);

    await page.getByLabel(locale === "bn" ? /আপনার নাম/ : /Your name/).fill("Playwright");
    await page.getByLabel(locale === "bn" ? /মোবাইল নম্বর/ : /Mobile number/).fill(phone());
    await page.getByRole("button", { name: locale === "bn" ? "পাঠান" : "Send enquiry" }).click();

    // The form talks to the real API, whose lead cap is 5/hour/IP. A local
    // re-run inside the hour legitimately hits that cap, so both the success
    // and the throttled message are correct outcomes — but the generic error
    // is not, and that is the one a broken CORS or payload actually produces.
    const status = page.getByRole("status");
    await expect(status).not.toBeEmpty();
    await expect(status).toContainText(
      locale === "bn"
        ? /ধন্যবাদ|অল্প সময়ে কয়েকটি বার্তা/
        : /Thank you|several enquiries from this connection/,
    );
  });
}

test("a malformed phone number is caught in the browser", async ({ page }) => {
  await page.goto("/en/contact");

  await page.getByLabel(/Your name/).fill("Playwright");
  await page.getByLabel(/Mobile number/).fill("12345");
  await page.getByRole("button", { name: "Send enquiry" }).click();

  await expect(page.getByRole("status")).toContainText(/valid Bangladeshi mobile number/);
});
