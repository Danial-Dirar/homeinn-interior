import type { Locale } from "@homeinn/types";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PostCard } from "@/components/blog/post-card";
import { getBlogPosts } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });
  return pageMetadata({
    locale,
    path: "/blog",
    title: t("title"),
    description: t("intro"),
  });
}

export default async function BlogPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const posts = await getBlogPosts();
  const t = await getTranslations("blog");

  return (
    <main id="main" className="bg-bone">
      <div className="mx-auto max-w-7xl px-5 py-28">
        <h1 className="display-1">{t("title")}</h1>
        <p className="mt-6 max-w-2xl text-lg text-ink/70">{t("intro")}</p>

        {posts.length === 0 ? (
          <p className="mt-16 text-ink/60">{t("empty")}</p>
        ) : (
          <ul className="mt-16 grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <li key={post.id}>
                <PostCard locale={locale} post={post} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
