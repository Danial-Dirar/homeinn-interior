import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getBlogPosts, getProjects, getServices } from "@/lib/content";
import { canonicalFor } from "@/lib/seo";

const STATIC_PATHS = ["/", "/about", "/services", "/projects", "/clients", "/blog", "/contact"];

/** Spec §11: generated from published content, both locales. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [services, projects, posts] = await Promise.all([
    getServices(),
    getProjects(),
    getBlogPosts(),
  ]);

  const paths = [
    ...STATIC_PATHS,
    ...services.map((service) => `/services/${service.slug}`),
    ...projects.map((project) => `/projects/${project.slug}`),
    ...posts.map((post) => `/blog/${post.slug}`),
  ];

  return paths.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: canonicalFor(locale, path),
      changeFrequency: "weekly" as const,
      priority: path === "/" ? 1 : 0.7,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((alt) => [alt, canonicalFor(alt, path)]),
        ),
      },
    })),
  );
}
