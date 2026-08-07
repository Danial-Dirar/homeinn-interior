import { expect, test } from "@playwright/test";

test("the bare origin redirects into a locale", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/(en|bn)$/);
});

test("switching language keeps the visitor on the same route", async ({ page }) => {
  await page.goto("/en/services");
  await page.getByRole("link", { name: "বাংলা" }).first().click();
  await expect(page).toHaveURL(/\/bn\/services$/);
});

test("a bn page declares its language and never falls back to English chrome", async ({ page }) => {
  await page.goto("/bn");
  await expect(page.locator("html")).toHaveAttribute("lang", "bn");
  await expect(page.getByRole("link", { name: "প্রকল্প" }).first()).toBeVisible();
});

test("every page declares hreflang alternates", async ({ page }) => {
  await page.goto("/en/contact");
  await expect(page.locator('link[hreflang="bn"]')).toHaveAttribute("href", /\/bn\/contact$/);
});
