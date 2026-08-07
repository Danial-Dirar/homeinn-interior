import type { Locale } from "@homeinn/types";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Picture } from "@/components/media/picture";
import { CopyBlock } from "@/components/sections/copy-block";
import { Credentials } from "@/components/sections/credentials";
import { getCertifications, getSettings, getTeam } from "@/lib/content";
import { text, textOrNull } from "@/lib/locale-text";

// Spec §12: these five come from the profile PDF, which is not in the repo.
// Each renders only once its message is written; see CopyBlock.
const COPY_BLOCKS = ["vision", "mission", "values", "strengths", "philosophy"] as const;

export default async function AboutPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [settings, certifications, team] = await Promise.all([
    getSettings(),
    getCertifications(),
    getTeam(),
  ]);
  const t = await getTranslations("about");
  const common = await getTranslations("common");

  return (
    <main id="main" className="bg-bone">
      <div className="mx-auto max-w-7xl px-5 py-28">
        <h1 className="display-1">{t("title")}</h1>

        <section className="mt-16 max-w-2xl">
          <p className="eyebrow">{t("storyEyebrow")}</p>
          <p className="mt-4 text-lg text-ink/70">{t("storyBody")}</p>
          <p className="mt-6 text-ink/60">{common("since", { year: settings.establishedYear })}</p>
        </section>

        <div className="mt-20 grid gap-14 sm:grid-cols-2">
          {COPY_BLOCKS.map((block) => (
            <CopyBlock key={block} title={t(`${block}Title`)} body={t(`${block}Body`)} />
          ))}
        </div>

        {team.length > 0 ? (
          <section className="mt-24">
            <h2 className="display-2">{t("teamTitle")}</h2>
            <ul className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              {team.map((member) => {
                const bio = textOrNull(member, "bio", locale);
                return (
                  <li key={member.id}>
                    {member.photo ? (
                      <Picture
                        media={member.photo}
                        locale={locale}
                        sizes="(min-width: 1024px) 25vw, 50vw"
                        className="aspect-square w-full object-cover"
                      />
                    ) : null}
                    <h3 className="heading mt-4">{member.name}</h3>
                    <p className="text-sm text-ink/60">{text(member, "role", locale)}</p>
                    {bio ? <p className="mt-2 text-sm text-ink/70">{bio}</p> : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>

      <Credentials locale={locale} certifications={certifications} />
    </main>
  );
}
