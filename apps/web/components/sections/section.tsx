import type { ReactNode } from "react";

interface SectionProps {
  eyebrow?: string;
  title?: string;
  /** §8: immersive sections sit on ink, content-dense ones on bone. */
  tone?: "ink" | "bone";
  id?: string;
  children: ReactNode;
}

export function Section({ eyebrow, title, tone = "bone", id, children }: SectionProps) {
  // `ground-ink` switches the accent to ember for everything inside.
  const ground = tone === "ink" ? "ground-ink bg-ink text-sand" : "bg-bone text-ink";

  return (
    <section id={id} className={`${ground} py-20 md:py-28`}>
      <div className="mx-auto max-w-7xl px-5">
        {/* No numbered 01 / 02 / 03: it reads as a template, and with the
            sections that hide when empty the visible run had gaps. */}
        {(eyebrow || title) && (
          <header className="mb-12 max-w-3xl">
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            {title ? <h2 className="display-2 mt-4">{title}</h2> : null}
          </header>
        )}
        {children}
      </div>
    </section>
  );
}
