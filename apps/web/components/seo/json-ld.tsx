/**
 * JSON-LD is data, not markup, so it goes in verbatim. `<` is escaped because a
 * literal `</script>` inside the payload would close the tag early.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
