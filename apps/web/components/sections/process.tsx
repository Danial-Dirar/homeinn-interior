import { useTranslations } from "next-intl";
import { Blueprint } from "@/components/blueprint/blueprint";
import { Section } from "./section";

/** Static section imagery from Home Inn's own design study (PDF References/Variations). */
const IMAGES = {
  model: { widths: [640, 1280], width: 1280, height: 854 },
  render: { widths: [960, 1600], width: 1600, height: 942 },
} as const;

function StepImage({ name, alt }: { name: keyof typeof IMAGES; alt: string }) {
  const { widths, width, height } = IMAGES[name];
  const largest = widths[widths.length - 1];
  // Inside <picture>, like components/media/picture.tsx: these are already
  // sized WebP files, and next/image would re-encode them.
  return (
    <picture>
      <img
        src={`/process/${name}-${largest}.webp`}
        srcSet={widths.map((w) => `/process/${name}-${w}.webp ${w}w`).join(", ")}
        sizes="(min-width: 1024px) 30vw, 100vw"
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        className="aspect-[3/2] w-full object-cover"
      />
    </picture>
  );
}

/**
 * How a Home Inn design develops, shown with the company's own material. The
 * model and the render are the same duplex; the plan is a different house and
 * the copy does not claim otherwise.
 */
export function Process() {
  const t = useTranslations("home");

  const steps = [
    {
      key: "plan",
      media: (
        <div className="flex aspect-[3/2] items-center justify-center bg-ink-raised p-6 text-sand/80">
          <Blueprint plan="ground-floor" label={t("processPlanAlt")} className="h-full max-w-full" />
        </div>
      ),
    },
    { key: "model", media: <StepImage name="model" alt={t("processModelAlt")} /> },
    { key: "render", media: <StepImage name="render" alt={t("processRenderAlt")} /> },
  ] as const;

  return (
    <Section eyebrow={t("processEyebrow")} title={t("processTitle")} tone="ink">
      <ol className="grid gap-10 lg:grid-cols-3">
        {steps.map((step) => {
          const name = `${step.key.charAt(0).toUpperCase()}${step.key.slice(1)}` as "Plan" | "Model" | "Render";
          return (
            <li key={step.key}>
              {step.media}
              <h3 className="heading mt-6">{t(`process${name}Title`)}</h3>
              <p className="mt-2 text-sand-dim">{t(`process${name}Body`)}</p>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
