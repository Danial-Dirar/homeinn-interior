import type { Locale } from "@homeinn/types";
import { useTranslations } from "next-intl";
import { Picture } from "@/components/media/picture";
import { Link } from "@/i18n/navigation";
import type { BlogPostView } from "@/lib/api.types";
import { formatDate } from "@/lib/dates";
import { text } from "@/lib/locale-text";

export function PostCard({ locale, post }: { locale: Locale; post: BlogPostView }) {
  const t = useTranslations("blog");
  const published = formatDate(post.publishedAt, locale);

  return (
    <article>
      <Link href={`/blog/${post.slug}`} className="group block">
        {post.cover ? (
          <Picture
            media={post.cover}
            locale={locale}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="aspect-[3/2] w-full object-cover"
          />
        ) : null}
        <h3 className="heading mt-4 group-hover:text-brand">{text(post, "title", locale)}</h3>
        <p className="mt-2 text-sm text-ink/70">{text(post, "excerpt", locale)}</p>
        {published ? (
          <p className="eyebrow mt-4 text-ink/70">{t("published", { date: published })}</p>
        ) : null}
      </Link>
    </article>
  );
}
