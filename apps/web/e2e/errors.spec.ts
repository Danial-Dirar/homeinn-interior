import { expect, test } from "@playwright/test";

test("an unknown route renders the localised 404", async ({ page }) => {
  const response = await page.goto("/en/not-a-real-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: /does not exist/ })).toBeVisible();
});

test("an unknown service slug 404s rather than erroring", async ({ page }) => {
  const response = await page.goto("/bn/services/not-a-real-service");
  expect(response?.status()).toBe(404);
});

test("an unpublished draft is not reachable by guessing its slug", async ({ page }) => {
  // The public API filters on published; this asserts the web app does not
  // route around it.
  const response = await page.goto("/en/projects/definitely-not-published");
  expect(response?.status()).toBe(404);
});
