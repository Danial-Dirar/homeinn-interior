import type { MediaView } from "@/lib/api.types";

/** A row as the admin read surface returns it. */
export type AdminRow = Record<string, unknown> & { id: string };

/** Form state: one entry per input, bilingual fields as `<name>En` / `<name>Bn`. */
export type FormValues = Record<string, unknown>;

interface Base {
  name: string;
  label: string;
  help?: string;
  required?: boolean;
  /** Spans the full width of the form grid. */
  wide?: boolean;
}

export type TextField = Base & {
  kind: "text" | "textarea" | "richtext" | "url";
  bilingual?: boolean;
  /** Stored as null when left empty (otherwise as ""). */
  nullable?: boolean;
  max?: number;
};
export type NumberField = Base & {
  kind: "number";
  min?: number;
  max?: number;
  step?: number;
  nullable?: boolean;
  defaultValue?: number;
};
/** Entered in taka, stored in poisha. Empty means "price on request". */
export type MoneyField = Base & { kind: "money" };
export type BooleanField = Base & { kind: "boolean"; defaultValue?: boolean };
export type SelectField = Base & {
  kind: "select";
  options: { value: string; label: string }[];
  nullable?: boolean;
  defaultValue?: string;
};
/** `name` is the foreign key, e.g. `workingAreaId`. */
export type RelationField = Base & {
  kind: "relation";
  resource: string;
  optionLabel: (row: AdminRow) => string;
  nullable?: boolean;
};
export type IconField = Base & { kind: "icon" };
/** `name` is the relation (`cover`), `key` the foreign key sent to the API (`coverId`). */
export type MediaField = Base & { kind: "media"; key: string; nullable?: boolean };
export type GalleryField = Base & { kind: "gallery"; key: string };
export type TagsField = Base & { kind: "tags" };
export type DateField = Base & { kind: "date"; nullable?: boolean };

export type Field =
  | TextField | NumberField | MoneyField | BooleanField | SelectField | RelationField
  | IconField | MediaField | GalleryField | TagsField | DateField;

export const isText = (field: Field): field is TextField =>
  field.kind === "text" || field.kind === "textarea" || field.kind === "richtext" || field.kind === "url";

/** The form keys a field owns: two for a bilingual text field, one otherwise. */
export function keysOf(field: Field): string[] {
  return isText(field) && field.bilingual ? [`${field.name}En`, `${field.name}Bn`] : [field.name];
}

export type { MediaView };
