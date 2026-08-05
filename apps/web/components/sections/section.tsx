import type { ReactNode } from "react";

interface SectionProps {
  /** Two-digit numeral. Spec §8 lists section numerals as a sanctioned use of brand. */
  numeral?: string;
  eyebrow?: string;
  title?: string;
  /** §8: immersive sections sit on ink, content-dense ones on bone. */
  tone?: "ink" | "bone";
  id?: string;
  children: ReactNode;
}

export function Section({ numeral, eyebrow, title, tone = "bone", id, children }: SectionProps) {
  const ground = tone === "ink" ? "bg-ink text-sand" : "bg-bone text-ink";

  return (
    <section id={id} className={`${ground} py-20 md:py-28`}>
      <div className="mx-auto max-w-7xl px-5">
        {(numeral || eyebrow || title) && (
          <header className="mb-12 max-w-3xl">
            <div className="flex items-baseline gap-4">
              {numeral ? <span className="section-numeral">{numeral}</span> : null}
              {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            </div>
            {title ? <h2 className="display-2 mt-4">{title}</h2> : null}
          </header>
        )}
        {children}
      </div>
    </section>
  );
}
