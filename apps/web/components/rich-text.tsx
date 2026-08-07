import { sanitizeRichText } from "@/lib/rich-text";

/** Renders a CMS body. Sanitised on the server, every time it is rendered. */
export function RichText({ html, className }: { html: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitizeRichText(html) }} />;
}
