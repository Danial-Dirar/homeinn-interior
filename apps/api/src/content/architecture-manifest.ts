import { join } from "node:path";
import { z } from "zod";

const EN_PREFIX = "3D render: ";
const BN_PREFIX = "৩ডি রেন্ডার: ";

const renderImageSchema = z.object({
  file: z.string().regex(/^[a-z0-9-]+\.jpg$/),
  altEn: z.string().max(300).refine((v) => v.startsWith(EN_PREFIX), { message: `altEn must start "${EN_PREFIX}"` }),
  altBn: z.string().max(300).refine((v) => v.startsWith(BN_PREFIX), { message: `altBn must start "${BN_PREFIX}"` }),
});
export type RenderImage = z.infer<typeof renderImageSchema>;

const projectSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    titleEn: z.string().trim().min(1).max(200),
    titleBn: z.string().trim().min(1).max(200),
    descriptionEn: z.string().refine((v) => v.includes("3D render"), { message: "say these are 3D renders" }),
    descriptionBn: z.string().refine((v) => v.includes("৩ডি রেন্ডার"), { message: "say these are ৩ডি রেন্ডার" }),
    sortOrder: z.number().int().min(0),
    cover: renderImageSchema,
    gallery: z.array(renderImageSchema).min(1).max(12),
  })
  .refine((p) => p.titleBn !== p.titleEn, { message: "titleBn must be Bangla", path: ["titleBn"] });
export type ArchitectureProject = z.infer<typeof projectSchema>;

/**
 * Design-stage projects shown in 3D renders. Every rule here exists so a
 * render cannot be published as if it were a photograph of a built house.
 */
export const architectureManifestSchema = z
  .array(projectSchema)
  .min(1)
  .refine((all) => new Set(all.map((p) => p.slug)).size === all.length, { message: "slugs must be unique" });

/** `<slug>/<file>` for every image the manifest names that is not on disk. */
export function missingRenders(manifest: ArchitectureProject[], exists: (path: string) => boolean): string[] {
  return manifest.flatMap((p) =>
    [p.cover, ...p.gallery].map((img) => join(p.slug, img.file)).filter((rel) => !exists(rel)),
  );
}
