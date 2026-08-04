import { z } from "zod";
import { bilingualText, idSchema } from "./common.js";

/** Rich-text bodies hold editor HTML, so they need far more room than a summary. */
const RICH_TEXT_MAX = 50_000;

const galleryIds = z.array(idSchema).max(60).optional();

// ---------- Service ----------

export const createServiceSchema = bilingualText("title", 200)
  .merge(bilingualText("summary", 500))
  .merge(bilingualText("body", RICH_TEXT_MAX))
  .merge(
    z.object({
      icon: z.string().trim().min(1).max(60), // lucide icon name
      coverId: idSchema.optional(),
      galleryIds,
      sortOrder: z.number().int().min(0).default(0),
      published: z.boolean().default(false),
    }),
  );
export type CreateServiceInput = z.infer<typeof createServiceSchema>;

export const updateServiceSchema = createServiceSchema.partial();
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

// ---------- WorkingArea ----------

export const createWorkingAreaSchema = bilingualText("name", 200).merge(
  z.object({ sortOrder: z.number().int().min(0).default(0) }),
);
export type CreateWorkingAreaInput = z.infer<typeof createWorkingAreaSchema>;

export const updateWorkingAreaSchema = createWorkingAreaSchema.partial();
export type UpdateWorkingAreaInput = z.infer<typeof updateWorkingAreaSchema>;

// ---------- Project ----------

export const createProjectSchema = bilingualText("title", 200)
  .merge(bilingualText("location", 200))
  .merge(bilingualText("description", RICH_TEXT_MAX))
  .merge(
    z.object({
      // Residential clients may not consent to being named — see spec §11.
      clientName: z.string().trim().max(200).optional(),
      areaSqft: z.number().int().positive().max(10_000_000).optional(),
      year: z.number().int().min(1990).max(2100).optional(),
      workingAreaId: idSchema,
      coverId: idSchema.optional(),
      galleryIds,
      featured: z.boolean().default(false),
      sortOrder: z.number().int().min(0).default(0),
      published: z.boolean().default(false),
    }),
  );
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema.partial();
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

/** `GET /api/projects?workingArea=<slug>` */
export const projectFilterSchema = z.object({
  workingArea: z.string().trim().min(1).max(120).optional(),
});
export type ProjectFilter = z.infer<typeof projectFilterSchema>;
