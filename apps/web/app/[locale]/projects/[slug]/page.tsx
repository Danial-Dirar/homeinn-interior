import type { Locale } from "@homeinn/types";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Picture } from "@/components/media/picture";
import { JsonLd } from "@/components/seo/json-ld";
import { RichText } from "@/components/rich-text";
import { Link } from "@/i18n/navigation";
import { getProject, getProjects } from "@/lib/content";
import { text } from "@/lib/locale-text";
import { largestSrc } from "@/lib/media";
import { breadcrumbJsonLd, metadataFromSeo, pageMetadata } from "@/lib/seo";

export async function generateStaticParams() {
  const projects = await getProjects();
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const project = await getProject(slug);
  if (!project) return {};

  const { title, description } = metadataFromSeo(project.seo, locale, {
    title: text(project, "title", locale),
    description: text(project, "location", locale),
  });

  return pageMetadata({
    locale,
    path: `/projects/${slug}`,
    title,
    description,
    image: project.seo?.ogImage
      ? largestSrc(project.seo.ogImage.sources[1]?.srcset ?? "")
      : project.cover
        ? largestSrc(project.cover.sources[1]?.srcset ?? "")
        : undefined,
  });
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const project = await getProject(slug);
  if (!project) notFound();

  const t = await getTranslations("projects");

  const facts = [
    { label: t("location"), value: text(project, "location", locale) },
    { label: t("year"), value: project.year ? String(project.year) : null },
    { label: t("area"), value: project.areaSqft ? `${project.areaSqft} ${t("areaUnit")}` : null },
    // Spec §11: a corporate client name is ordinary commercial reference
    // material. Residential rows never carry a name in the first place.
    { label: t("client"), value: project.clientName },
  ].filter((fact) => fact.value);

  return (
    <main id="main" className="bg-bone">
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: t("title"), path: "/projects" },
          { name: text(project, "title", locale), path: `/projects/${slug}` },
        ])}
      />
      {project.cover ? (
        <Picture
          media={project.cover}
          locale={locale}
          sizes="100vw"
          priority
          className="h-[60svh] w-full object-cover"
        />
      ) : null}

      <div className="mx-auto max-w-7xl px-5 py-28">
        <Link href={`/projects?area=${project.workingArea.slug}`} className="eyebrow text-brand">
          {text(project.workingArea, "name", locale)}
        </Link>
        <h1 className="display-1 mt-4 max-w-4xl">{text(project, "title", locale)}</h1>

        <dl className="mt-12 grid gap-8 border-y border-ink/10 py-8 sm:grid-cols-4">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt className="eyebrow text-ink/70">{fact.label}</dt>
              <dd className="mt-2">{fact.value}</dd>
            </div>
          ))}
        </dl>

        <RichText
          html={text(project, "description", locale)}
          className="mt-16 max-w-2xl space-y-4 [&_li]:ml-5 [&_li]:list-disc"
        />

        {project.gallery.length > 0 ? (
          <ul className="mt-20 grid gap-6 sm:grid-cols-2">
            {project.gallery.map((image) => (
              <li key={image.id}>
                <Picture
                  media={image}
                  locale={locale}
                  sizes="(min-width: 640px) 50vw, 100vw"
                  className="aspect-[3/2] w-full object-cover"
                />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </main>
  );
}
