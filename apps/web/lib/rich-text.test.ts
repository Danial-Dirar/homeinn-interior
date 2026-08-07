import { describe, expect, it } from "vitest";
import { sanitizeRichText } from "./rich-text";

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
