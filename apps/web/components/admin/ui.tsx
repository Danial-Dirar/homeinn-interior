import { cn } from "@homeinn/ui";
import type { ReactNode } from "react";

/** The panel's page heading, with an optional line under it and actions to the right. */
export function PageHeader({
  title, description, actions, eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-ink/10 pb-6">
      <div className="min-w-0">
        {eyebrow ? <p className="mb-2 text-xs uppercase tracking-[0.14em] text-ink/65">{eyebrow}</p> : null}
        <h1 className="font-display text-3xl leading-tight">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm text-ink/70">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  );
}

/** A quiet surface for grouping content on the cream ground. */
export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("border border-ink/10 bg-[#FBF8F3] p-6", className)}>{children}</section>;
}

const TONES = {
  neutral: "bg-ink/[0.06] text-ink/80",
  brand: "bg-brand text-white",
  good: "bg-[#2F5D46] text-white",
  warn: "bg-[#F4E2C6] text-[#5E3A08]",
  muted: "bg-transparent text-ink/65 ring-1 ring-inset ring-ink/15",
} as const;

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap px-2 py-0.5 text-xs font-medium", TONES[tone])}>
      {children}
    </span>
  );
}

/** Errors and confirmations. Errors interrupt (`alert`); confirmations do not (`status`). */
export function Notice({ tone, children }: { tone: "error" | "success" | "info"; children: ReactNode }) {
  const styles = {
    error: "border-[#9B2C1F] bg-[#FBEAE6] text-[#7A1F14]",
    success: "border-[#2F5D46] bg-[#E6F0EA] text-[#1F4331]",
    info: "border-ink/20 bg-ink/[0.04] text-ink/80",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("border-l-4 px-4 py-3 text-sm", styles)}>
      {children}
    </div>
  );
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <p role="status" className="flex items-center gap-3 py-10 text-sm text-ink/65">
      <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-ink/20 border-t-brand" />
      {label}…
    </p>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="border border-dashed border-ink/20 px-6 py-12 text-center text-sm text-ink/70">{children}</p>;
}

/** A label, the control, and its help or error, wired together for screen readers. */
export function FieldShell({
  id, label, help, error, required, children,
}: {
  id: string;
  label: ReactNode;
  help?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-1">
        <label id={`${id}-label`} htmlFor={id} className="text-sm font-medium">{label}</label>
        {required ? <span aria-hidden="true" className="text-sm text-brand">*</span> : null}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-[#9B2C1F]">{error}</p>
      ) : help ? (
        <p id={`${id}-help`} className="text-xs text-ink/65">{help}</p>
      ) : null}
    </div>
  );
}

/** Shared look for inputs, selects and textareas on the cream ground. */
export const controlClass =
  "w-full border border-ink/20 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink/45 " +
  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand " +
  "aria-[invalid=true]:border-[#9B2C1F] disabled:opacity-60";

/** "3 hours ago", "yesterday", "12 Oct" — an inbox reads better in relative time. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const seconds = Math.round((now.getTime() - then.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: then.getFullYear() === now.getFullYear() ? undefined : "numeric" }).format(then);
}

export function fullDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit",
  }).format(new Date(iso));
}

/** The smallest WebP derivative, for thumbnails. */
export function thumbSrc(media: { sources: { type: string; srcset: string }[] }): string {
  const source = media.sources.find((s) => s.type === "image/webp") ?? media.sources[0];
  return source?.srcset.split(",")[0]?.trim().split(" ")[0] ?? "";
}

/** A thumbnail of a library image, its English alt text as the alt. */
export function Thumb({
  media, className,
}: {
  media: { sources: { type: string; srcset: string }[]; altEn: string; width: number; height: number };
  className?: string;
}) {
  return (
    <picture>
      <img
        src={thumbSrc(media)} alt={media.altEn} width={media.width} height={media.height} loading="lazy"
        className={cn("h-full w-full object-cover", className)}
      />
    </picture>
  );
}
