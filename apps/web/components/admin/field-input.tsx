"use client";

import { Button } from "@homeinn/ui";
import dynamic from "next/dynamic";
import { ImagePlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { adminGet } from "@/lib/admin/api";
import { isText, type AdminRow, type Field, type FormValues, type MediaView } from "@/lib/admin/fields";
import { iconFor, ICON_NAMES } from "@/lib/icons";
import { MediaPicker } from "./media-picker";
import { controlClass, FieldShell, Thumb } from "./ui";

const RichTextEditor = dynamic(() => import("./rich-text-editor").then((m) => m.RichTextEditor), {
  ssr: false,
  loading: () => <div className="h-56 border border-ink/20 bg-white" />,
});

const LANGUAGES = [
  { suffix: "En", name: "English", lang: "en" },
  { suffix: "Bn", name: "Bangla", lang: "bn" },
] as const;

/** One field of a resource form; a bilingual text field renders as a pair. */
export function FieldInput({
  field, values, errors, onChange,
}: {
  field: Field;
  values: FormValues;
  errors: Record<string, string>;
  onChange: (key: string, value: unknown) => void;
}) {
  if (isText(field)) {
    const pairs = field.bilingual
      ? LANGUAGES.map((l) => ({ key: `${field.name}${l.suffix}`, label: `${field.label} (${l.name})`, lang: l.lang }))
      : [{ key: field.name, label: field.label, lang: undefined }];
    return (
      <div className={field.bilingual && field.kind !== "richtext" ? "grid gap-4 sm:grid-cols-2" : "grid gap-4"}>
        {pairs.map((pair, index) => {
          const id = `f-${pair.key}`;
          const value = String(values[pair.key] ?? "");
          const describedBy = errors[pair.key] ? `${id}-error` : field.help && index === pairs.length - 1 ? `${id}-help` : undefined;
          const common = {
            id, lang: pair.lang, value,
            "aria-invalid": errors[pair.key] ? true : undefined,
            "aria-describedby": describedBy,
            "aria-required": field.required || undefined,
            className: controlClass,
          };
          return (
            <FieldShell
              key={pair.key} id={id} label={pair.label} required={field.required}
              error={errors[pair.key]} help={index === pairs.length - 1 ? field.help : undefined}
            >
              {field.kind === "richtext" ? (
                <RichTextEditor id={id} value={value} invalid={Boolean(errors[pair.key])} onChange={(html) => onChange(pair.key, html)} />
              ) : field.kind === "textarea" ? (
                <textarea {...common} rows={4} maxLength={field.max} onChange={(e) => onChange(pair.key, e.target.value)} />
              ) : (
                <input
                  {...common} type={field.kind === "url" ? "url" : "text"} maxLength={field.max}
                  inputMode={field.kind === "url" ? "url" : undefined}
                  onChange={(e) => onChange(pair.key, e.target.value)}
                />
              )}
            </FieldShell>
          );
        })}
      </div>
    );
  }

  const id = `f-${field.name}`;
  const error = errors[field.name];
  const shell = (control: React.ReactNode) => (
    <FieldShell id={id} label={field.label} required={field.required} error={error} help={field.help}>{control}</FieldShell>
  );
  const describedBy = error ? `${id}-error` : field.help ? `${id}-help` : undefined;
  const aria = { "aria-invalid": error ? true : undefined, "aria-describedby": describedBy };

  switch (field.kind) {
    case "number":
      return shell(
        <input
          id={id} type="number" inputMode="decimal" min={field.min} max={field.max} step={field.step ?? 1}
          value={String(values[field.name] ?? "")} onChange={(e) => onChange(field.name, e.target.value)}
          className={controlClass} {...aria}
        />,
      );
    case "money":
      return shell(
        <div className="flex">
          <span aria-hidden="true" className="grid place-items-center border border-r-0 border-ink/20 bg-ink/[0.04] px-3 text-sm">৳</span>
          <input
            id={id} type="text" inputMode="decimal" value={String(values[field.name] ?? "")}
            onChange={(e) => onChange(field.name, e.target.value)} className={controlClass} {...aria}
          />
        </div>,
      );
    case "boolean":
      return (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={id} className="inline-flex cursor-pointer items-center gap-3 text-sm font-medium">
            <input
              id={id} type="checkbox" checked={Boolean(values[field.name])}
              onChange={(e) => onChange(field.name, e.target.checked)}
              aria-describedby={field.help ? `${id}-help` : undefined}
              className="size-4 accent-brand"
            />
            {field.label}
          </label>
          {field.help ? <p id={`${id}-help`} className="pl-7 text-xs text-ink/65">{field.help}</p> : null}
        </div>
      );
    case "select":
      return shell(
        <select id={id} value={String(values[field.name] ?? "")} onChange={(e) => onChange(field.name, e.target.value)} className={controlClass} {...aria}>
          {field.nullable || !field.required ? <option value="">None</option> : <option value="" disabled>Choose…</option>}
          {field.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>,
      );
    case "relation":
      return shell(<RelationSelect id={id} field={field} value={String(values[field.name] ?? "")} onChange={(v) => onChange(field.name, v)} aria={aria} />);
    case "icon": {
      const current = String(values[field.name] ?? "");
      const Icon = current ? iconFor(current) : null;
      return shell(
        <div className="flex items-center gap-3">
          <select id={id} value={current} onChange={(e) => onChange(field.name, e.target.value)} className={controlClass} {...aria}>
            <option value="" disabled>Choose…</option>
            {ICON_NAMES.map((name) => <option key={name} value={name}>{name.replace(/-/g, " ")}</option>)}
          </select>
          {Icon ? <Icon aria-hidden="true" className="size-6 shrink-0 text-brand" /> : null}
        </div>,
      );
    }
    case "tags":
      return shell(
        <input id={id} type="text" value={String(values[field.name] ?? "")} onChange={(e) => onChange(field.name, e.target.value)} className={controlClass} {...aria} />,
      );
    case "date":
      return shell(
        <input id={id} type="date" value={String(values[field.name] ?? "")} onChange={(e) => onChange(field.name, e.target.value)} className={controlClass} {...aria} />,
      );
    case "media":
      return (
        <FieldShell id={id} label={field.label} required={field.required} error={error} help={field.help}>
          <MediaInput
            id={id} value={(values[field.name] as MediaView | null) ?? null} removable={!field.required}
            onChange={(media) => onChange(field.name, media)}
          />
        </FieldShell>
      );
    case "gallery":
      return (
        <FieldShell id={id} label={field.label} error={error} help={field.help ?? "Images shown with this on its page. Add from the library or upload new ones."}>
          <GalleryInput id={id} value={(values[field.name] as MediaView[]) ?? []} onChange={(list) => onChange(field.name, list)} />
        </FieldShell>
      );
  }
}

function RelationSelect({
  id, field, value, onChange, aria,
}: {
  id: string;
  field: Extract<Field, { kind: "relation" }>;
  value: string;
  onChange: (value: string) => void;
  aria: Record<string, unknown>;
}) {
  const [options, setOptions] = useState<AdminRow[] | null>(null);

  useEffect(() => {
    let live = true;
    adminGet<AdminRow[]>(`/admin/${field.resource}`)
      .then((rows) => live && setOptions(rows))
      .catch(() => live && setOptions([]));
    return () => {
      live = false;
    };
  }, [field.resource]);

  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={controlClass} disabled={!options} {...aria}>
      {field.required ? <option value="" disabled>{options ? "Choose…" : "Loading…"}</option> : <option value="">None</option>}
      {(options ?? []).map((row) => <option key={row.id} value={row.id}>{field.optionLabel(row)}</option>)}
    </select>
  );
}

function MediaInput({
  id, value, removable, onChange,
}: {
  id: string;
  value: MediaView | null;
  removable: boolean;
  onChange: (media: MediaView | null) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-start gap-4">
      <div className="aspect-[4/3] w-40 shrink-0 overflow-hidden border border-ink/15 bg-ink/[0.05]">
        {value ? <Thumb media={value} /> : <span className="grid h-full place-items-center text-xs text-ink/65">No image</span>}
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        {value ? <p className="line-clamp-2 text-xs text-ink/70">{value.altEn}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button id={id} type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
            <ImagePlus aria-hidden="true" className="size-4" /> {value ? "Change" : "Choose image"}
          </Button>
          {value && removable ? (
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)}>Remove</Button>
          ) : null}
        </div>
      </div>
      <MediaPicker open={open} onOpenChange={setOpen} onChoose={([media]) => onChange(media ?? null)} />
    </div>
  );
}

/**
 * The gallery is a set, not a sequence: the database's join table keeps no
 * position, so the panel offers adding and removing only. Pretending to
 * reorder here would promise an order the site does not keep.
 */
function GalleryInput({
  id, value, onChange,
}: {
  id: string;
  value: MediaView[];
  onChange: (list: MediaView[]) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      {value.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {value.map((media, index) => (
            <li key={media.id} className="relative">
              <div className="aspect-square overflow-hidden border border-ink/15"><Thumb media={media} /></div>
              <button
                type="button" aria-label={`Remove image ${index + 1} from the gallery`}
                onClick={() => onChange(value.filter((m) => m.id !== media.id))}
                className="absolute right-1.5 top-1.5 grid size-7 place-items-center bg-white/90 text-[#9B2C1F] shadow-sm hover:bg-white"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="text-xs text-ink/65">No gallery images yet.</p>}
      <div>
        <Button id={id} type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
          <ImagePlus aria-hidden="true" className="size-4" /> Add images
        </Button>
      </div>
      <MediaPicker
        open={open} onOpenChange={setOpen} multiple
        onChoose={(picked) => onChange([...value, ...picked.filter((p) => !value.some((m) => m.id === p.id))])}
      />
    </div>
  );
}

