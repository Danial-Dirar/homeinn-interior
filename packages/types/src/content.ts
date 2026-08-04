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

// ---------- BlogPost ----------

export const createBlogPostSchema = bilingualText("title", 200)
  .merge(bilingualText("excerpt", 500))
  .merge(bilingualText("body", RICH_TEXT_MAX))
  .merge(
    z.object({
      coverId: idSchema.optional(),
      tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
      published: z.boolean().default(false),
      // A post can be published-but-future-dated; the public list respects it.
      publishedAt: z.coerce.date().optional(),
    }),
  );
export type CreateBlogPostInput = z.infer<typeof createBlogPostSchema>;

export const updateBlogPostSchema = createBlogPostSchema.partial();
export type UpdateBlogPostInput = z.infer<typeof updateBlogPostSchema>;

// ---------- Testimonial ----------

export const createTestimonialSchema = bilingualText("quote", 2000).merge(
  z.object({
    authorName: z.string().trim().min(1).max(200),
    roleEn: z.string().trim().max(200).optional(),
    roleBn: z.string().trim().max(200).optional(),
    rating: z.number().int().min(1).max(5).optional(),
    avatarId: idSchema.optional(),
    published: z.boolean().default(false),
    sortOrder: z.number().int().min(0).default(0),
  }),
);
export type CreateTestimonialInput = z.infer<typeof createTestimonialSchema>;

export const updateTestimonialSchema = createTestimonialSchema.partial();
export type UpdateTestimonialInput = z.infer<typeof updateTestimonialSchema>;

// ---------- TeamMember ----------

export const createTeamMemberSchema = bilingualText("role", 200).merge(
  z.object({
    name: z.string().trim().min(1).max(200),
    bioEn: z.string().trim().max(4000).optional(),
    bioBn: z.string().trim().max(4000).optional(),
    photoId: idSchema.optional(),
    published: z.boolean().default(false),
    sortOrder: z.number().int().min(0).default(0),
  }),
);
export type CreateTeamMemberInput = z.infer<typeof createTeamMemberSchema>;

export const updateTeamMemberSchema = createTeamMemberSchema.partial();
export type UpdateTeamMemberInput = z.infer<typeof updateTeamMemberSchema>;

// ---------- Certification ----------

export const createCertificationSchema = bilingualText("title", 200).merge(
  z.object({
    issuer: z.string().trim().max(200).optional(),
    reference: z.string().trim().max(120).optional(), // e.g. BIN 001489494-0804
    documentId: idSchema.optional(),
    sortOrder: z.number().int().min(0).default(0),
  }),
);
export type CreateCertificationInput = z.infer<typeof createCertificationSchema>;

export const updateCertificationSchema = createCertificationSchema.partial();
export type UpdateCertificationInput = z.infer<typeof updateCertificationSchema>;

// ---------- HeroSegment ----------

export const heroTargetSchema = z.enum(["desktop", "mobile"]);
export type HeroTarget = z.infer<typeof heroTargetSchema>;

/** `GET /api/hero?target=mobile` — desktop is the default surface. */
export const heroQuerySchema = z.object({ target: heroTargetSchema.default("desktop") });
export type HeroQuery = z.infer<typeof heroQuerySchema>;

export const createHeroSegmentSchema = bilingualText("label", 120).merge(
  z.object({
    imageId: idSchema,
    foregroundId: idSchema.optional(),
    captionEn: z.string().trim().max(300).optional(),
    captionBn: z.string().trim().max(300).optional(),
    focalX: z.number().min(0).max(1).default(0.5),
    active: z.boolean().default(true),
    showOnMobile: z.boolean().default(false),
    sortOrder: z.number().int().min(0),
  }),
);
export type CreateHeroSegmentInput = z.infer<typeof createHeroSegmentSchema>;

export const updateHeroSegmentSchema = createHeroSegmentSchema.partial();
export type UpdateHeroSegmentInput = z.infer<typeof updateHeroSegmentSchema>;
