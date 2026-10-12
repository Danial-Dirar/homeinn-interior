import { describe, expect, it } from "vitest";
import { plainExcerpt, sanitizeRichText } from "./rich-text";

describe("sanitizeRichText", () => {
  it("keeps the formatting an editor actually uses", () => {
    const html = "<p>A <strong>fitted</strong> <em>kitchen</em>.</p><ul><li>One</li></ul>";
    expect(sanitizeRichText(html)).toBe(html);
  });

  it("keeps links but forces them safe", () => {
    expect(sanitizeRichText('<a href="https://example.com">x</a>'))
      .toContain('rel="noreferrer noopener"');
  });

  it("strips a script tag", () => {
    expect(sanitizeRichText("<p>hi</p><script>alert(1)</script>")).toBe("<p>hi</p>");
  });

  it("strips an inline handler", () => {
    expect(sanitizeRichText('<p onclick="alert(1)">hi</p>')).toBe("<p>hi</p>");
  });

  it("strips a javascript: URL", () => {
    expect(sanitizeRichText('<a href="javascript:alert(1)">x</a>')).not.toContain("javascript:");
  });

  it("survives empty input", () => {
    expect(sanitizeRichText("")).toBe("");
  });
});

describe("plainExcerpt", () => {
  it("turns a CMS body into one plain sentence for a page description", () => {
    expect(plainExcerpt("<p>A two-storey <strong>family</strong> house.</p><p>Shown in 3D renders.</p>", 160))
      .toBe("A two-storey family house. Shown in 3D renders.");
  });

  it("cuts long text at a word, not in the middle of one", () => {
    const text = plainExcerpt(`<p>${"word ".repeat(60)}</p>`, 40);
    expect(text.length).toBeLessThanOrEqual(41);
    expect(text.endsWith("…")).toBe(true);
    expect(text).not.toMatch(/wor…$/);
  });

  it("decodes the entities an editor writes", () => {
    expect(plainExcerpt("<p>Tiles &amp; timber</p>", 160)).toBe("Tiles & timber");
  });
});

