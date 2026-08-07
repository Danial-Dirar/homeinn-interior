import sanitizeHtml from "sanitize-html";

/**
 * The tags a CMS body is allowed to contain. Deliberately narrow: anything the
 * editor cannot produce has no reason to survive into the public page. Editors
 * are authenticated and role-gated, so this is defence in depth rather than an
 * untrusted-input boundary — but a stored-XSS bug in Plan 1C's admin would
 * otherwise become a public-site problem here.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "strong", "em", "u", "s", "blockquote",
    "ul", "ol", "li", "h2", "h3", "h4", "a", "figure", "figcaption", "img",
  ],
  allowedAttributes: {
    // `rel` is on the allowlist because the transform below adds it — without
    // this entry the allowlist would strip the hardening straight back off.
    a: ["href", "title", "rel", "target"],
    img: ["src", "alt", "width", "height", "loading"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noreferrer noopener" }),
  },
};

export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, OPTIONS);
}
