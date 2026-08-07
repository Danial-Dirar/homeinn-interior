import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const ROUTES = ["/", "/about", "/services", "/projects", "/clients", "/blog", "/contact"];

for (const locale of ["en", "bn"] as const) {
  for (const route of ROUTES) {
    test(`${locale}${route} has no detectable accessibility violations`, async ({ page }) => {
      await page.goto(`/${locale}${route === "/" ? "" : route}`);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }
}
