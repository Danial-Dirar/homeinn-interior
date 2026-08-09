import type { PublicMedia } from "@homeinn/types";

/** Over the wire, `createdAt` is an ISO string, not a Date. */
export type MediaView = Omit<PublicMedia, "createdAt"> & { createdAt: string };

export interface SeoView {
  titleEn: string | null;
  titleBn: string | null;
  descriptionEn: string | null;
  descriptionBn: string | null;
  ogImage: MediaView | null;
}

export interface ServiceView {
  id: string;
  slug: string;
  titleEn: string; titleBn: string;
  summaryEn: string; summaryBn: string;
  bodyEn: string; bodyBn: string;
  icon: string;
  sortOrder: number;
  published: boolean;
  cover: MediaView | null;
}
export type ServiceDetailView = ServiceView & { gallery: MediaView[]; seo: SeoView | null };

export interface WorkingAreaView {
  id: string;
  slug: string;
  nameEn: string; nameBn: string;
  sortOrder: number;
}

export interface ProjectView {
  id: string;
  slug: string;
  titleEn: string; titleBn: string;
  clientName: string | null;
  locationEn: string; locationBn: string;
  areaSqft: number | null;
  year: number | null;
  descriptionEn: string; descriptionBn: string;
  workingAreaId: string;
  featured: boolean;
  published: boolean;
  sortOrder: number;
  cover: MediaView | null;
}
export type ProjectDetailView = ProjectView & {
  gallery: MediaView[];
  seo: SeoView | null;
  workingArea: WorkingAreaView;
};

export interface HeroSegmentView {
  id: string;
  sortOrder: number;
  labelEn: string; labelBn: string;
  captionEn: string | null; captionBn: string | null;
  focalX: number;
  active: boolean;
  showOnMobile: boolean;
  image: MediaView;
  foreground: MediaView | null;
}

export interface BlogPostView {
  id: string;
  slug: string;
  titleEn: string; titleBn: string;
  excerptEn: string; excerptBn: string;
  bodyEn: string; bodyBn: string;
  tags: string[];
  published: boolean;
  publishedAt: string | null;
  cover: MediaView | null;
}
export type BlogPostDetailView = BlogPostView & { seo: SeoView | null };

export interface TestimonialView {
  id: string;
  authorName: string;
  roleEn: string | null; roleBn: string | null;
  quoteEn: string; quoteBn: string;
  rating: number | null;
  avatar: MediaView | null;
  sortOrder: number;
}

export interface TeamMemberView {
  id: string;
  name: string;
  roleEn: string; roleBn: string;
  bioEn: string | null; bioBn: string | null;
  photo: MediaView | null;
  sortOrder: number;
}

export interface CertificationView {
  id: string;
  titleEn: string; titleBn: string;
  issuer: string | null;
  reference: string | null;
  document: MediaView | null;
  sortOrder: number;
}

export interface ClientLogoView {
  id: string;
  name: string;
  website: string | null;
  sortOrder: number;
  logo: MediaView;
}

export interface CorporateClientView {
  id: string;
  serial: number;
  companyName: string;
  address: string;
  isFlagship: boolean;
  needsVerification: boolean;
}

/**
 * Aggregate only. Spec §11 — the residential list names private individuals
 * with their neighbourhoods, so the public surface never carries the rows.
 */
export interface ResidentialSummaryView {
  total: number;
  districts: string[];
}

export interface SiteSettingsView {
  id: string;
  phone: string;
  whatsapp: string;
  phoneSecondary: string | null;
  whatsappSecondary: string | null;
  email: string;
  addressEn: string; addressBn: string;
  hoursEn: string; hoursBn: string;
  facebookUrl: string | null;
  instagramUrl: string | null;
  youtubeUrl: string | null;
  establishedYear: number;
  corporateProjectCount: number;
  residentialProjectCount: number;
  districtCount: number;
}
