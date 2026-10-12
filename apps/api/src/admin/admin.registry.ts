import type { PrismaService } from "../prisma/prisma.service";

export type AdminRow = Record<string, unknown> & { id: string };

/** The slice of a Prisma model delegate the admin read surface uses. */
export interface AdminDelegate {
  findMany(args: object): Promise<AdminRow[]>;
  findUnique(args: object): Promise<AdminRow | null>;
  count(args?: object): Promise<number>;
}

export interface AdminResource {
  model: (prisma: PrismaService) => AdminDelegate;
  orderBy: object | object[];
  listInclude?: object;
  detailInclude?: object;
  /** Single image relations, serialised with their srcset for the panel. */
  media?: string[];
  /** Ordered image lists. */
  galleries?: string[];
  /** Has a `published` flag, so the overview can count drafts. */
  publishable?: boolean;
}

const delegate = (pick: (prisma: PrismaService) => unknown) =>
  (prisma: PrismaService) => pick(prisma) as AdminDelegate;

/**
 * Everything the admin panel lists and edits, keyed by the name in its URL.
 * The public routes return published rows by slug; the panel needs drafts too,
 * by id, with every relation it edits. One table keeps the twelve in step.
 */
export const ADMIN_RESOURCES: Record<string, AdminResource> = {
  services: {
    model: delegate((p) => p.service),
    orderBy: { sortOrder: "asc" },
    listInclude: { cover: true },
    detailInclude: { cover: true, gallery: true },
    media: ["cover"],
    galleries: ["gallery"],
    publishable: true,
  },
  projects: {
    model: delegate((p) => p.project),
    orderBy: [{ featured: "desc" }, { sortOrder: "asc" }],
    listInclude: { cover: true, workingArea: { select: { id: true, slug: true, nameEn: true } } },
    detailInclude: { cover: true, gallery: true, workingArea: true },
    media: ["cover"],
    galleries: ["gallery"],
    publishable: true,
  },
  "working-areas": {
    model: delegate((p) => p.workingArea),
    orderBy: { sortOrder: "asc" },
    listInclude: { _count: { select: { projects: true } } },
    detailInclude: { _count: { select: { projects: true } } },
  },
  hero: {
    model: delegate((p) => p.heroSegment),
    orderBy: { sortOrder: "asc" },
    listInclude: { image: true, foreground: true },
    detailInclude: { image: true, foreground: true },
    media: ["image", "foreground"],
  },
  blog: {
    model: delegate((p) => p.blogPost),
    orderBy: [{ publishedAt: { sort: "desc", nulls: "first" } }, { titleEn: "asc" }],
    listInclude: { cover: true },
    detailInclude: { cover: true },
    media: ["cover"],
    publishable: true,
  },
  testimonials: {
    model: delegate((p) => p.testimonial),
    orderBy: { sortOrder: "asc" },
    listInclude: { avatar: true },
    detailInclude: { avatar: true },
    media: ["avatar"],
    publishable: true,
  },
  team: {
    model: delegate((p) => p.teamMember),
    orderBy: { sortOrder: "asc" },
    listInclude: { photo: true },
    detailInclude: { photo: true },
    media: ["photo"],
    publishable: true,
  },
  certifications: {
    model: delegate((p) => p.certification),
    orderBy: { sortOrder: "asc" },
    listInclude: { document: true },
    detailInclude: { document: true },
    media: ["document"],
  },
  products: {
    model: delegate((p) => p.shopProduct),
    orderBy: [{ featured: "desc" }, { sortOrder: "asc" }],
    listInclude: { cover: true },
    detailInclude: { cover: true, gallery: true },
    media: ["cover"],
    galleries: ["gallery"],
    publishable: true,
  },
  "client-logos": {
    model: delegate((p) => p.clientLogo),
    orderBy: { sortOrder: "asc" },
    listInclude: { logo: true },
    detailInclude: { logo: true },
    media: ["logo"],
    publishable: true,
  },
  "corporate-clients": {
    model: delegate((p) => p.corporateClient),
    orderBy: { serial: "asc" },
  },
  "residential-clients": {
    model: delegate((p) => p.residentialClient),
    orderBy: { serial: "asc" },
  },
};
