import { z } from "zod";
import { bilingualText, idSchema } from "./common.js";

/** Rich-text bodies hold editor HTML, so they need far more room than a summary. */
const RICH_TEXT_MAX = 50_000;

const galleryIds = z.array(idSchema).max(60).optional();

/**
 * Optional values an editor must also be able to remove again: a cover, a
 * price, a year. `null` clears the column; leaving the key out keeps it.
 */
const clearableId = idSchema.nullable().optional();
const clearableText = (max: number) => z.string().trim().max(max).nullable().optional();
/** A web address: http or https only — `.url()` alone would accept javascript:. */
export const webUrl = z
  .string()
  .trim()
  .url()
  .max(300)
  .refine((value) => /^https?:\/\//i.test(value), { message: "Must start with http:// or https://" });

/**
 * Long text that may stay empty until someone writes it: imported projects
 * and furniture have none, and saving them to rename or publish must not
 * demand invented copy.
 */
const optionalRichText = z.string().trim().max(RICH_TEXT_MAX).default("");

/** Poisha in a Postgres INT4: anything larger would fail as a 500, not a 400. */
const MAX_POISHA = 2_147_483_647;

const clearableUrl = z
  .union([webUrl, z.literal("")])
  .nullable()
  .optional()
  .transform((value) => (value === "" ? null : value));

// ---------- Service ----------

export const createServiceSchema = bilingualText("title", 200)
  .merge(bilingualText("summary", 500))
  .merge(bilingualText("body", RICH_TEXT_MAX))
  .merge(
    z.object({
      icon: z.string().trim().min(1).max(60), // lucide icon name
      coverId: clearableId,
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
  .merge(
    z.object({
      descriptionEn: optionalRichText,
      descriptionBn: optionalRichText,
      // Empty until known: a design-stage project has no site yet, and the
      // page hides an empty facts row rather than inventing one.
      locationEn: z.string().trim().max(200).default(""),
      locationBn: z.string().trim().max(200).default(""),
      // Residential clients may not consent to being named — see spec §11.
      clientName: clearableText(200),
      areaSqft: z.number().int().positive().max(10_000_000).nullable().optional(),
      year: z.number().int().min(1990).max(2100).nullable().optional(),
      workingAreaId: idSchema,
      coverId: clearableId,
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
      coverId: clearableId,
      tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
      published: z.boolean().default(false),
      // A post can be published-but-future-dated; the public list respects it.
      publishedAt: z.coerce.date().nullable().optional(),
    }),
  );
export type CreateBlogPostInput = z.infer<typeof createBlogPostSchema>;

export const updateBlogPostSchema = createBlogPostSchema.partial();
export type UpdateBlogPostInput = z.infer<typeof updateBlogPostSchema>;

// ---------- Testimonial ----------

export const createTestimonialSchema = bilingualText("quote", 2000).merge(
  z.object({
    authorName: z.string().trim().min(1).max(200),
    roleEn: clearableText(200),
    roleBn: clearableText(200),
    rating: z.number().int().min(1).max(5).nullable().optional(),
    avatarId: clearableId,
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
    bioEn: clearableText(4000),
    bioBn: clearableText(4000),
    photoId: clearableId,
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
    issuer: clearableText(200),
    reference: clearableText(120), // e.g. BIN 001489494-0804
    documentId: clearableId,
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
    foregroundId: clearableId,
    captionEn: clearableText(300),
    captionBn: clearableText(300),
    focalX: z.number().min(0).max(1).default(0.5),
    active: z.boolean().default(true),
    showOnMobile: z.boolean().default(false),
    sortOrder: z.number().int().min(0),
  }),
);
export type CreateHeroSegmentInput = z.infer<typeof createHeroSegmentSchema>;

export const updateHeroSegmentSchema = createHeroSegmentSchema.partial();
export type UpdateHeroSegmentInput = z.infer<typeof updateHeroSegmentSchema>;

// ---------- ShopProduct (furniture) ----------

export const createProductSchema = bilingualText("name", 200)
  .merge(bilingualText("summary", 500))
  .merge(
    z.object({
      descriptionEn: optionalRichText,
      descriptionBn: optionalRichText,
      /** Poisha. `null` means "price on request". */
      priceBdt: z.number().int().min(0).max(MAX_POISHA).nullable().optional(),
      madeToOrder: z.boolean().default(true),
      leadTimeDays: z.number().int().min(0).max(3650).nullable().optional(),
      serviceId: clearableId,
      coverId: clearableId,
      galleryIds,
      /** The same piece from another angle, shown when the cover is hovered. */
      secondViewId: clearableId,
      featured: z.boolean().default(false),
      sortOrder: z.number().int().min(0).default(0),
      published: z.boolean().default(false),
    }),
  );
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

// ---------- ClientLogo ----------

export const createClientLogoSchema = z.object({
  name: z.string().trim().min(1).max(200),
  website: clearableUrl,
  logoId: idSchema,
  sortOrder: z.number().int().min(0).default(0),
  published: z.boolean().default(true),
});
export type CreateClientLogoInput = z.infer<typeof createClientLogoSchema>;

export const updateClientLogoSchema = createClientLogoSchema.partial();
export type UpdateClientLogoInput = z.infer<typeof updateClientLogoSchema>;

// ---------- Client lists ----------

export const createCorporateClientSchema = z.object({
  serial: z.number().int().min(1).max(100_000),
  companyName: z.string().trim().min(1).max(300),
  address: z.string().trim().min(1).max(500),
  isFlagship: z.boolean().default(false),
  needsVerification: z.boolean().default(false),
});
export type CreateCorporateClientInput = z.infer<typeof createCorporateClientSchema>;

export const updateCorporateClientSchema = createCorporateClientSchema.partial();
export type UpdateCorporateClientInput = z.infer<typeof updateCorporateClientSchema>;

export const createResidentialClientSchema = z.object({
  serial: z.number().int().min(1).max(100_000),
  clientName: z.string().trim().min(1).max(300),
  address: z.string().trim().min(1).max(500),
  needsVerification: z.boolean().default(false),
  /** Spec §11: a name reaches the public site only with this set. */
  publiclyListed: z.boolean().default(false),
});
export type CreateResidentialClientInput = z.infer<typeof createResidentialClientSchema>;

export const updateResidentialClientSchema = createResidentialClientSchema.partial();
export type UpdateResidentialClientInput = z.infer<typeof updateResidentialClientSchema>;
