import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_THEME, THEME_KEY, readTheme, themeBootScript } from "./theme";

afterEach(() => {
  localStorage.clear();
  document.documentElement.dataset.theme = DEFAULT_THEME;
});

describe("readTheme", () => {
  it("defaults to light when nothing has been chosen", () => {
    expect(DEFAULT_THEME).toBe("light");
    expect(readTheme(localStorage)).toBe("light");
  });

  it("returns a theme the visitor chose before", () => {
    localStorage.setItem(THEME_KEY, "dark");
    expect(readTheme(localStorage)).toBe("dark");
  });

  it("ignores anything it did not write", () => {
    localStorage.setItem(THEME_KEY, "sepia");
    expect(readTheme(localStorage)).toBe("light");
  });

  it("falls back to light when storage throws, as it can in private browsing", () => {
    const broken = { getItem: () => { throw new Error("denied"); } } as unknown as Storage;
    expect(readTheme(broken)).toBe("light");
  });
});

describe("themeBootScript", () => {
  // It runs in <head> before the page paints, so a dark-theme visitor never
  // sees a flash of the light page first.
  const run = () => new Function(themeBootScript)();

  it("applies a stored dark theme before paint", () => {
    localStorage.setItem(THEME_KEY, "dark");
    run();
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("leaves the server's light default alone otherwise", () => {
    run();
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});
