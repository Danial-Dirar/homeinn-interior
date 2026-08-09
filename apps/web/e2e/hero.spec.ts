import { expect, test } from "@playwright/test";

test.describe("the scroll panorama", () => {
  test("renders a stacked layout under prefers-reduced-motion", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/en");

    // Spec §7: no pin, no transform — the same content on ordinary scroll.
    await expect(page.locator("[data-hero-frame]")).toHaveCount(0);
    await context.close();
  });

  test("keeps the page usable from the keyboard past the hero", async ({ page }) => {
    await page.goto("/en");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  });
});
