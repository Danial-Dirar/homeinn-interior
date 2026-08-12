import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const ROUTES = [
  "/", "/furniture", "/about", "/services", "/projects", "/clients", "/blog", "/contact",
];

for (const locale of ["en", "bn"] as const) {
  for (const route of ROUTES) {
    test(`${locale}${route} has no detectable accessibility violations`, async ({ page }) => {
      await page.goto(`/${locale}${route === "/" ? "" : route}`);
      // Scroll-reveal animations are transient by design; axe should judge the
      // settled page, not a frame midway through a stagger.
      await page.waitForTimeout(1200);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }
}
