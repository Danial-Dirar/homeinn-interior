import {
  Armchair, Award, BookOpen, Briefcase, Building2, FolderKanban, GalleryHorizontal, Home,
  LayoutGrid, MessageSquareQuote, Users, type LucideIcon,
} from "lucide-react";
import type { AdminRow, Field, MediaView } from "./fields";

export type ResourceGroup = "Work" | "Home page" | "Company" | "Journal";

export interface ResourceDef {
  /** The key in the panel's URL and in `GET /api/admin/:resource`. */
  name: string;
  label: string;
  singular: string;
  group: ResourceGroup;
  icon: LucideIcon;
  /** Where writes go: `POST <writePath>`, `PATCH <writePath>/:id`. */
  writePath: string;
  title: (row: AdminRow) => string;
  subtitle?: (row: AdminRow) => string;
  thumbnail?: (row: AdminRow) => MediaView | null | undefined;
  /** The row's page on the public site, when it has one. */
  publicPath?: (row: AdminRow) => string | null;
  /** Shown above the list and the form. */
  intro?: string;
  /** Part of the site's structure: admins only, never moderators (lib/admin/roles.ts). */
  adminOnly?: boolean;
  fields: Field[];
}

const str = (value: unknown) => (typeof value === "string" ? value : "");
const media = (key: string) => (row: AdminRow) => row[key] as MediaView | null | undefined;
const published = { name: "published", label: "Published on the site", kind: "boolean" } as const;
const featured = { name: "featured", label: "Featured (shown first)", kind: "boolean" } as const;
const sortOrder = {
  name: "sortOrder", label: "Order", kind: "number", min: 0, defaultValue: 0,
  help: "Lower numbers come first.",
} as const;
const gallery = { name: "gallery", key: "galleryIds", label: "Gallery", kind: "gallery", wide: true } as const;

export const RESOURCES: ResourceDef[] = [
  {
    name: "projects",
    label: "Projects",
    singular: "project",
    group: "Work",
    icon: FolderKanban,
    writePath: "/projects",
    title: (row) => str(row.titleEn),
    subtitle: (row) => [
      (row.workingArea as { nameEn?: string } | undefined)?.nameEn,
      str(row.locationEn),
      row.year ? String(row.year) : "",
    ].filter(Boolean).join(" · "),
    thumbnail: media("cover"),
    publicPath: (row) => `/en/projects/${str(row.slug)}`,
    fields: [
      { name: "title", label: "Title", kind: "text", bilingual: true, required: true, max: 200 },
      {
        name: "workingAreaId", label: "Working area", kind: "relation", resource: "working-areas",
        required: true, optionLabel: (row) => str(row.nameEn),
      },
      {
        name: "location", label: "Location", kind: "text", bilingual: true, max: 200,
        help: "Leave empty until the site is known. An empty location is hidden, not guessed.",
      },
      {
        name: "clientName", label: "Client", kind: "text", nullable: true, max: 200,
        help: "Never shown on cards. Leave empty for private homeowners who have not agreed to be named.",
      },
      { name: "areaSqft", label: "Area (sq ft)", kind: "number", nullable: true, min: 1 },
      { name: "year", label: "Year", kind: "number", nullable: true, min: 1990, max: 2100 },
      {
        name: "description", label: "Description", kind: "richtext", bilingual: true, wide: true,
        help: "Can wait until it is written; the page simply shows none.",
      },
      { name: "cover", key: "coverId", label: "Cover image", kind: "media", nullable: true },
      gallery,
      featured,
      published,
      sortOrder,
    ],
  },
  {
    name: "services",
    adminOnly: true,
    label: "Services",
    singular: "service",
    group: "Work",
    icon: Briefcase,
    writePath: "/services",
    title: (row) => str(row.titleEn),
    subtitle: (row) => str(row.summaryEn),
    thumbnail: media("cover"),
    publicPath: (row) => `/en/services/${str(row.slug)}`,
    fields: [
      { name: "title", label: "Title", kind: "text", bilingual: true, required: true, max: 200 },
      { name: "summary", label: "Summary", kind: "textarea", bilingual: true, required: true, max: 500 },
      { name: "body", label: "Page text", kind: "richtext", bilingual: true, required: true, wide: true },
      { name: "icon", label: "Icon", kind: "icon", required: true },
      { name: "cover", key: "coverId", label: "Cover image", kind: "media", nullable: true },
      gallery,
      published,
      sortOrder,
    ],
  },
  {
    name: "working-areas",
    adminOnly: true,
    label: "Working areas",
    singular: "working area",
    group: "Work",
    icon: LayoutGrid,
    writePath: "/working-areas",
    title: (row) => str(row.nameEn),
    subtitle: (row) => {
      const count = (row._count as { projects?: number } | undefined)?.projects ?? 0;
      return count === 1 ? "1 project" : `${count} projects`;
    },
    intro: "The kinds of project the site files work under. They become the filter on the projects page.",
    fields: [
      { name: "name", label: "Name", kind: "text", bilingual: true, required: true, max: 200 },
      sortOrder,
    ],
  },
  {
    name: "products",
    label: "Furniture",
    singular: "piece",
    group: "Work",
    icon: Armchair,
    writePath: "/products",
    title: (row) => str(row.nameEn),
    subtitle: (row) => (typeof row.priceBdt === "number"
      ? `৳${(row.priceBdt / 100).toLocaleString("en-US")}`
      : "Price on request"),
    thumbnail: media("cover"),
    publicPath: (row) => `/en/furniture/${str(row.slug)}`,
    fields: [
      { name: "name", label: "Name", kind: "text", bilingual: true, required: true, max: 200 },
      { name: "summary", label: "Summary", kind: "textarea", bilingual: true, required: true, max: 500 },
      {
        name: "description", label: "Long description", kind: "richtext", bilingual: true, wide: true,
        help: "Optional: the furniture page shows the summary.",
      },
      { name: "priceBdt", label: "Price (taka)", kind: "money", help: "Leave empty for “price on request”." },
      { name: "madeToOrder", label: "Made to order", kind: "boolean", defaultValue: true },
      { name: "leadTimeDays", label: "Lead time (days)", kind: "number", nullable: true, min: 0 },
      {
        name: "serviceId", label: "Belongs to service", kind: "relation", resource: "services",
        nullable: true, optionLabel: (row) => str(row.titleEn),
      },
      { name: "cover", key: "coverId", label: "Cover image", kind: "media", nullable: true },
      {
        name: "secondView", key: "secondViewId", label: "Second view", kind: "media", nullable: true,
        help: "The same piece from another angle. It takes the cover's place while someone hovers over it; on a phone the two take turns.",
      },
      gallery,
      featured,
      published,
      sortOrder,
    ],
  },
  {
    name: "hero",
    adminOnly: true,
    label: "Hero",
    singular: "hero image",
    group: "Home page",
    icon: GalleryHorizontal,
    writePath: "/hero",
    title: (row) => str(row.labelEn),
    subtitle: (row) => [row.active ? "Showing" : "Hidden", row.showOnMobile ? "on phones too" : ""].filter(Boolean).join(", "),
    thumbnail: media("image"),
    intro: "The panorama at the top of the home page. Each image carries a short label.",
    fields: [
      { name: "label", label: "Label", kind: "text", bilingual: true, required: true, max: 120 },
      { name: "caption", label: "Caption", kind: "text", bilingual: true, nullable: true, max: 300 },
      { name: "image", key: "imageId", label: "Image", kind: "media", required: true },
      {
        name: "foreground", key: "foregroundId", label: "Foreground layer", kind: "media", nullable: true,
        help: "Optional cut-out that moves slightly in front of the image.",
      },
      {
        name: "focalX", label: "Focus point", kind: "number", min: 0, max: 1, step: 0.05, defaultValue: 0.5,
        help: "Where the subject sits across the image: 0 is the left edge, 1 the right. Keeps it in frame on narrow screens.",
      },
      { name: "active", label: "Showing", kind: "boolean", defaultValue: true },
      { name: "showOnMobile", label: "Also on phones", kind: "boolean" },
      sortOrder,
    ],
  },
  {
    name: "testimonials",
    label: "Testimonials",
    singular: "testimonial",
    group: "Home page",
    icon: MessageSquareQuote,
    writePath: "/testimonials",
    title: (row) => str(row.authorName),
    subtitle: (row) => str(row.quoteEn).slice(0, 90),
    thumbnail: media("avatar"),
    fields: [
      { name: "authorName", label: "Name", kind: "text", required: true, max: 200 },
      { name: "role", label: "Role or company", kind: "text", bilingual: true, nullable: true, max: 200 },
      { name: "quote", label: "Quote", kind: "textarea", bilingual: true, required: true, max: 2000, wide: true },
      { name: "rating", label: "Rating (1–5)", kind: "number", nullable: true, min: 1, max: 5 },
      { name: "avatar", key: "avatarId", label: "Photo", kind: "media", nullable: true },
      published,
      sortOrder,
    ],
  },
  {
    name: "team",
    label: "Team",
    singular: "team member",
    group: "Company",
    icon: Users,
    writePath: "/team",
    title: (row) => str(row.name),
    subtitle: (row) => str(row.roleEn),
    thumbnail: media("photo"),
    fields: [
      { name: "name", label: "Name", kind: "text", required: true, max: 200 },
      { name: "role", label: "Role", kind: "text", bilingual: true, required: true, max: 200 },
      { name: "bio", label: "Short bio", kind: "textarea", bilingual: true, nullable: true, max: 4000, wide: true },
      { name: "photo", key: "photoId", label: "Photo", kind: "media", nullable: true },
      published,
      sortOrder,
    ],
  },
  {
    name: "certifications",
    label: "Certifications",
    singular: "certification",
    group: "Company",
    icon: Award,
    writePath: "/certifications",
    title: (row) => str(row.titleEn),
    subtitle: (row) => [str(row.issuer), str(row.reference)].filter(Boolean).join(" · "),
    thumbnail: media("document"),
    fields: [
      { name: "title", label: "Title", kind: "text", bilingual: true, required: true, max: 200 },
      { name: "issuer", label: "Issued by", kind: "text", nullable: true, max: 200 },
      { name: "reference", label: "Reference number", kind: "text", nullable: true, max: 120 },
      { name: "document", key: "documentId", label: "Scan of the certificate", kind: "media", nullable: true },
      sortOrder,
    ],
  },
  {
    name: "client-logos",
    label: "Client logos",
    singular: "client logo",
    group: "Company",
    icon: Building2,
    writePath: "/client-logos",
    title: (row) => str(row.name),
    subtitle: (row) => str(row.website),
    thumbnail: media("logo"),
    intro: "Other companies' marks, shown on the clients page with their permission.",
    fields: [
      { name: "name", label: "Company", kind: "text", required: true, max: 200 },
      { name: "website", label: "Website", kind: "url", nullable: true },
      { name: "logo", key: "logoId", label: "Logo", kind: "media", required: true },
      { ...published, defaultValue: true },
      sortOrder,
    ],
  },
  {
    name: "corporate-clients",
    label: "Corporate clients",
    singular: "corporate client",
    group: "Company",
    icon: Building2,
    writePath: "/clients/corporate",
    title: (row) => str(row.companyName),
    subtitle: (row) => `No. ${String(row.serial)} · ${str(row.address)}`,
    intro: "The project ledger from the company profile, shown as the table on the clients page.",
    fields: [
      { name: "serial", label: "Number", kind: "number", required: true, min: 1 },
      { name: "companyName", label: "Company", kind: "text", required: true, max: 300 },
      { name: "address", label: "Address", kind: "text", required: true, max: 500, wide: true },
      { name: "isFlagship", label: "Flagship project", kind: "boolean" },
      { name: "needsVerification", label: "Needs checking", kind: "boolean" },
    ],
  },
  {
    name: "residential-clients",
    label: "Residential clients",
    singular: "residential client",
    group: "Company",
    icon: Home,
    writePath: "/clients/residential",
    title: (row) => str(row.clientName),
    subtitle: (row) => `${row.publiclyListed ? "Named on the site" : "Private"} · ${str(row.address)}`,
    intro: "Private homeowners. The site shows only the total and the districts, and names a person only when “publicly listed” is ticked, with their agreement.",
    fields: [
      { name: "serial", label: "Number", kind: "number", required: true, min: 1 },
      { name: "clientName", label: "Name", kind: "text", required: true, max: 300 },
      { name: "address", label: "Address", kind: "text", required: true, max: 500, wide: true },
      { name: "needsVerification", label: "Needs checking", kind: "boolean" },
      {
        name: "publiclyListed", label: "Publicly listed", kind: "boolean",
        help: "Only with the client's agreement: their name appears on the public clients page.",
      },
    ],
  },
  {
    name: "blog",
    label: "Blog",
    singular: "post",
    group: "Journal",
    icon: BookOpen,
    writePath: "/blog",
    title: (row) => str(row.titleEn),
    subtitle: (row) => str(row.excerptEn).slice(0, 90),
    thumbnail: media("cover"),
    publicPath: (row) => `/en/blog/${str(row.slug)}`,
    intro: "The blog is not in the site's menu at the moment; posts are still reachable by their address.",
    fields: [
      { name: "title", label: "Title", kind: "text", bilingual: true, required: true, max: 200 },
      { name: "excerpt", label: "Excerpt", kind: "textarea", bilingual: true, required: true, max: 500 },
      { name: "body", label: "Post", kind: "richtext", bilingual: true, required: true, wide: true },
      { name: "cover", key: "coverId", label: "Cover image", kind: "media", nullable: true },
      { name: "tags", label: "Tags", kind: "tags", help: "Separate with commas." },
      {
        name: "publishedAt", label: "Publish date", kind: "date", nullable: true,
        help: "Leave empty to use the day it is published.",
      },
      published,
    ],
  },
];

export function resourceNamed(name: string): ResourceDef | undefined {
  return RESOURCES.find((resource) => resource.name === name);
}

/** The settings row: one record, always edited, never created or deleted. */
export const SETTINGS_FIELDS: Field[] = [
  { name: "phone", label: "Phone", kind: "text", required: true, max: 40 },
  {
    name: "whatsapp", label: "WhatsApp", kind: "text", max: 40,
    help: "Leave empty if this number does not answer on WhatsApp.",
  },
  { name: "phoneSecondary", label: "Second phone", kind: "text", nullable: true, max: 40 },
  { name: "whatsappSecondary", label: "Second WhatsApp", kind: "text", nullable: true, max: 40 },
  { name: "email", label: "Email", kind: "text", required: true, max: 200 },
  { name: "address", label: "Address", kind: "textarea", bilingual: true, required: true, max: 500 },
  { name: "hours", label: "Opening hours", kind: "text", bilingual: true, required: true, max: 200 },
  { name: "facebookUrl", label: "Facebook page", kind: "url" },
  { name: "instagramUrl", label: "Instagram", kind: "url" },
  { name: "youtubeUrl", label: "YouTube", kind: "url" },
  { name: "establishedYear", label: "Year established", kind: "number", required: true, min: 1900, max: 2100 },
  {
    name: "corporateProjectCount", label: "Corporate projects", kind: "number", required: true, min: 0,
    help: "The figures in the home page's statement. Keep them true as work is added.",
  },
  { name: "residentialProjectCount", label: "Residential projects", kind: "number", required: true, min: 0 },
  { name: "districtCount", label: "Districts worked in", kind: "number", required: true, min: 0 },
];
