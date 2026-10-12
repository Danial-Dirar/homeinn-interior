import { isText, keysOf, type AdminRow, type Field, type FormValues, type MediaView } from "./fields";

const text = (value: unknown) => (typeof value === "string" ? value : value == null ? "" : String(value));

/** The company works in Dhaka time, so a date is the day as it was there. */
const DHAKA_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit",
});

function dhakaDay(iso: unknown): string {
  const date = new Date(text(iso));
  return Number.isNaN(date.getTime()) ? "" : DHAKA_DAY.format(date);
}

/** A saved row (or nothing, for a new one) as form state. */
export function initialValues(fields: Field[], row?: AdminRow | Record<string, unknown> | null): FormValues {
  const values: FormValues = {};
  for (const field of fields) {
    const saved = row?.[field.name];
    switch (field.kind) {
      case "text": case "textarea": case "richtext": case "url":
        for (const key of keysOf(field)) values[key] = text(row?.[key]);
        break;
      case "number":
        values[field.name] = saved != null ? String(saved) : field.defaultValue != null ? String(field.defaultValue) : "";
        break;
      case "money":
        values[field.name] = typeof saved === "number" ? String(saved / 100) : "";
        break;
      case "boolean":
        values[field.name] = typeof saved === "boolean" ? saved : (field.defaultValue ?? false);
        break;
      case "select":
        values[field.name] = text(saved ?? field.defaultValue);
        break;
      case "relation": case "icon":
        values[field.name] = text(saved);
        break;
      case "media":
        values[field.name] = (saved as MediaView | null | undefined) ?? null;
        break;
      case "gallery":
        values[field.name] = Array.isArray(saved) ? saved : [];
        break;
      case "tags":
        values[field.name] = Array.isArray(saved) ? saved.join(", ") : "";
        break;
      case "date":
        values[field.name] = saved ? dhakaDay(saved) : "";
        break;
    }
  }
  return values;
}

/**
 * Form state as the API's write schemas expect it. `original` is the saved
 * row, when editing: a date whose day was not changed is sent back exactly as
 * saved, so saving a post never moves it.
 */
export function toPayload(
  fields: Field[],
  values: FormValues,
  original?: Record<string, unknown> | null,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = values[field.name];
    switch (field.kind) {
      case "text": case "textarea": case "richtext": case "url":
        for (const key of keysOf(field)) {
          const value = text(values[key]).trim();
          out[key] = value === "" && field.nullable ? null : value;
        }
        break;
      case "number": {
        const value = text(raw).trim();
        out[field.name] = value === "" ? (field.nullable ? null : (field.defaultValue ?? 0)) : Number(value);
        break;
      }
      case "money": {
        const value = text(raw).trim();
        out[field.name] = value === "" ? null : Math.round(Number(value) * 100);
        break;
      }
      case "boolean":
        out[field.name] = Boolean(raw);
        break;
      case "select": case "relation": case "icon": {
        const value = text(raw);
        out[field.name] = value === "" ? null : value;
        break;
      }
      case "media":
        out[field.key] = (raw as MediaView | null)?.id ?? null;
        break;
      case "gallery":
        out[field.key] = ((raw as MediaView[] | undefined) ?? []).map((media) => media.id);
        break;
      case "tags":
        out[field.name] = text(raw).split(",").map((tag) => tag.trim()).filter(Boolean);
        break;
      case "date": {
        const value = text(raw).trim();
        const saved = original?.[field.name];
        if (value === "") out[field.name] = null;
        else if (saved && dhakaDay(saved) === value) out[field.name] = text(saved);
        // A new day starts at midnight in Dhaka, so a post dated today is out
        // at once rather than at 6 a.m., when midnight UTC arrives.
        else out[field.name] = `${value}T00:00:00+06:00`;
        break;
      }
    }
  }
  return out;
}

/** Problems to show before anything is sent, keyed like the form. Empty when fine. */
export function validate(fields: Field[], values: FormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    if (isText(field)) {
      for (const key of keysOf(field)) {
        const value = text(values[key]).trim();
        if (field.required && value === "") errors[key] = "Required";
        else if (field.kind === "url" && value !== "" && !/^https?:\/\/\S+$/i.test(value)) {
          errors[key] = "Enter a full address starting with https://";
        } else if (field.max && value.length > field.max) errors[key] = `At most ${field.max} characters`;
      }
      continue;
    }
    const raw = values[field.name];
    switch (field.kind) {
      case "number": {
        const value = text(raw).trim();
        if (value === "") {
          if (field.required) errors[field.name] = "Required";
        } else if (!Number.isFinite(Number(value))) errors[field.name] = "Enter a number";
        else if (field.min != null && Number(value) < field.min) errors[field.name] = `Must be ${field.min} or more`;
        else if (field.max != null && Number(value) > field.max) errors[field.name] = `Must be ${field.max} or less`;
        break;
      }
      case "money": {
        const value = text(raw).trim();
        if (value !== "" && !(Number.isFinite(Number(value)) && Number(value) >= 0)) {
          errors[field.name] = "Enter an amount in taka, or leave it empty";
        }
        break;
      }
      case "select": case "relation": case "icon": case "date":
        if (field.required && text(raw).trim() === "") errors[field.name] = "Required";
        break;
      case "media":
        if (field.required && !raw) errors[field.name] = "Choose an image";
        break;
      default:
        break;
    }
  }
  return errors;
}
