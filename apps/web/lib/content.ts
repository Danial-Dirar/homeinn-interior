import { apiGet, apiGetOr, apiGetOrNull } from "./api";
import type {
  BlogPostDetailView, BlogPostView, CertificationView, ClientLogoView, CorporateClientView,
  HeroSegmentView,
  ProjectDetailView, ProjectView, ResidentialSummaryView, ServiceDetailView, ServiceView,
  SiteSettingsView, TeamMemberView, TestimonialView, WorkingAreaView,
} from "./api.types";

export const getSettings = () => apiGet<SiteSettingsView>("/settings", { tags: ["settings"] });

export const getServices = () => apiGet<ServiceView[]>("/services", { tags: ["services"] });
export const getService = (slug: string) =>
  apiGetOrNull<ServiceDetailView>(`/services/${slug}`, { tags: ["services"] });

export const getWorkingAreas = () =>
  apiGet<WorkingAreaView[]>("/working-areas", { tags: ["working-areas"] });

export const getProjects = (workingArea?: string) =>
  apiGet<ProjectView[]>(
    workingArea ? `/projects?workingArea=${encodeURIComponent(workingArea)}` : "/projects",
    { tags: ["projects"] },
  );
export const getProject = (slug: string) =>
  apiGetOrNull<ProjectDetailView>(`/projects/${slug}`, { tags: ["projects"] });

export const getHero = (target: "desktop" | "mobile" = "desktop") =>
  apiGetOr<HeroSegmentView[]>(`/hero?target=${target}`, [], { tags: ["hero"] });

export const getBlogPosts = () => apiGet<BlogPostView[]>("/blog", { tags: ["blog"] });
export const getBlogPost = (slug: string) =>
  apiGetOrNull<BlogPostDetailView>(`/blog/${slug}`, { tags: ["blog"] });

// Sections that hide when empty (spec §12) tolerate an API failure by staying hidden.
export const getTestimonials = () =>
  apiGetOr<TestimonialView[]>("/testimonials", [], { tags: ["testimonials"] });
export const getTeam = () => apiGetOr<TeamMemberView[]>("/team", [], { tags: ["team"] });
export const getCertifications = () =>
  apiGetOr<CertificationView[]>("/certifications", [], { tags: ["certifications"] });
export const getClientLogos = () =>
  apiGetOr<ClientLogoView[]>("/client-logos", [], { tags: ["client-logos"] });
export const getCorporateClients = () =>
  apiGetOr<CorporateClientView[]>("/clients/corporate", [], { tags: ["clients"] });

export const getResidentialSummary = () =>
  apiGetOr<ResidentialSummaryView>(
    "/clients/residential-summary",
    { total: 0, districts: [] },
    { tags: ["clients"] },
  );
