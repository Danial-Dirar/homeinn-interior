import { revalidateTag } from "next/cache";
import { createHash, timingSafeEqual } from "node:crypto";

/** The tags `lib/content.ts` puts on page fetches. Nothing else is accepted. */
const KNOWN_TAGS = new Set([
  "settings", "services", "working-areas", "projects", "hero", "blog", "testimonials",
  "team", "certifications", "products", "client-logos", "clients",
]);

/** Constant-time, and hashed first so differing lengths reveal nothing either. */
function sameSecret(presented: string, expected: string): boolean {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(presented), digest(expected));
}

/**
 * Called by the API after an editor saves, so the change is on the site at
 * once rather than when the five-minute fetch cache expires. The browser never
 * calls this: the shared secret lives only on the two servers.
 */
export async function POST(request: Request): Promise<Response> {
  const expected = process.env.REVALIDATE_SECRET;
  const presented = request.headers.get("x-revalidate-secret") ?? "";
  if (!expected || !sameSecret(presented, expected)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { tags?: unknown } | null;
  const tags = Array.isArray(body?.tags)
    ? body.tags.filter((tag): tag is string => typeof tag === "string" && KNOWN_TAGS.has(tag))
    : [];
  for (const tag of tags) revalidateTag(tag);
  return Response.json({ revalidated: tags });
}
