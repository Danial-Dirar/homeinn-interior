import type { Locale } from "@homeinn/types";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Picture } from "@/components/media/picture";
import { RichText } from "@/components/rich-text";
import { getBlogPost, getBlogPosts } from "@/lib/content";
import { formatDate } from "@/lib/dates";
import { text } from "@/lib/locale-text";

export async function generateStaticParams() {
  const posts = await getBlogPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const post = await getBlogPost(slug);
  if (!post) notFound();

  const t = await getTranslations("blog");
  const published = formatDate(post.publishedAt, locale);

  return (
    <main id="main" className="bg-bone">
      <article className="mx-auto max-w-3xl px-5 py-28">
        <h1 className="display-1">{text(post, "title", locale)}</h1>
        {published ? (
          <p className="eyebrow mt-6 text-ink/40">
            <time dateTime={post.publishedAt ?? undefined}>
              {t("published", { date: published })}
            </time>
          </p>
        ) : null}

        {post.cover ? (
          <Picture
            media={post.cover}
            locale={locale}
            sizes="(min-width: 768px) 768px, 100vw"
            priority
            className="mt-12 aspect-[3/2] w-full object-cover"
          />
        ) : null}

        <RichText
          html={text(post, "body", locale)}
          className="mt-12 space-y-4 text-lg [&_a]:text-brand [&_a]:underline [&_li]:ml-5 [&_li]:list-disc"
        />

        {post.tags.length > 0 ? (
          <footer className="mt-16 border-t border-ink/10 pt-6">
            <h2 className="eyebrow text-ink/40">{t("tags")}</h2>
            <ul className="mt-3 flex flex-wrap gap-3 text-sm text-ink/60">
              {post.tags.map((tag) => <li key={tag}>{tag}</li>)}
            </ul>
          </footer>
        ) : null}
      </article>
    </main>
  );
}
