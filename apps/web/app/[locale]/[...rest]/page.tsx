import { notFound } from "next/navigation";

/**
 * An unmatched path under `[locale]` would otherwise fall through to the root
 * `app/not-found.tsx`, which has no messages and no chrome. Catching it here and
 * calling `notFound()` puts the visitor on the localised 404 instead.
 */
export default function CatchAllNotFound() {
  notFound();
}
