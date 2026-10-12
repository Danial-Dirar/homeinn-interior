import { z } from "zod";

/**
 * One photograph in the home-page hero, as written in
 * `prisma/seed-data/hero/hero.ts`. Both labels are real copy — a Bangla page
 * reads `labelBn` — and every file carries where it came from and under what
 * licence, because these are someone else's photographs.
 */
const heroManifestEntrySchema = z
  .object({
    file: z.string().regex(/^[a-z0-9-]+\.(jpe?g|png|webp)$/),
    labelEn: z.string().trim().min(1).max(120),
    labelBn: z.string().trim().min(1).max(120),
    altEn: z.string().trim().min(1).max(300),
    altBn: z.string().trim().min(1).max(300),
    focalX: z.number().min(0).max(1),
    showOnMobile: z.boolean(),
    source: z.object({
      url: z.string().url(),
      author: z.string().trim().min(1),
      licence: z.string().trim().min(1),
    }),
  })
  .refine((entry) => entry.labelBn !== entry.labelEn, {
    message: "labelBn must be a Bangla label, not the English one repeated",
    path: ["labelBn"],
  });

export type HeroManifestEntry = z.infer<typeof heroManifestEntrySchema>;

export const heroManifestSchema = z
  .array(heroManifestEntrySchema)
  .min(1)
  .refine((entries) => new Set(entries.map((e) => e.labelEn)).size === entries.length, {
    message: "labelEn is the sync key and must be unique",
  })
  // Spec §7: the phone strip is a curated subset, and an empty one would fall
  // back to the whole desktop strip at phone pacing.
  .refine((entries) => entries.some((e) => e.showOnMobile), {
    message: "at least one segment must be flagged showOnMobile",
  });

export interface ExistingSegment {
  id: string;
  labelEn: string;
  imageId: string;
  /** `Media.bytes` — the byte length of the source file it was ingested from. */
  imageBytes: number;
}

export interface HeroSyncPlan {
  create: { entry: HeroManifestEntry; sortOrder: number }[];
  update: { id: string; imageId: string; entry: HeroManifestEntry; sortOrder: number }[];
  remove: { id: string; imageId: string }[];
}

/**
 * What it takes to make the hero match the manifest, in the manifest's order.
 *
 * A segment is kept only when the manifest still names its label **and** its
 * photograph is the same file — same byte length as `sizeOf(entry.file)`,
 * which is what ingest stores in `Media.bytes`. Kept segments are re-ordered
 * and re-labelled; anything else goes, image and all, and the manifest's
 * version is ingested fresh. Without the size check a new "Kitchen" photo would
 * silently keep showing the old one.
 */
export function planHeroSync(
  existing: ExistingSegment[],
  manifest: HeroManifestEntry[],
  sizeOf: (file: string) => number,
): HeroSyncPlan {
  const plan: HeroSyncPlan = { create: [], update: [], remove: [] };
  const kept = new Set<string>();

  manifest.forEach((entry, sortOrder) => {
    const current = existing.find(
      (segment) => segment.labelEn === entry.labelEn && segment.imageBytes === sizeOf(entry.file),
    );
    if (current) {
      kept.add(current.id);
      plan.update.push({ id: current.id, imageId: current.imageId, entry, sortOrder });
    } else {
      plan.create.push({ entry, sortOrder });
    }
  });

  for (const segment of existing) {
    if (!kept.has(segment.id)) plan.remove.push({ id: segment.id, imageId: segment.imageId });
  }
  return plan;
}
