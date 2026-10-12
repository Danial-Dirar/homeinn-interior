"use client";

import { Button } from "@homeinn/ui";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { adminGet, adminSend } from "@/lib/admin/api";
import { keysOf, type AdminRow, type Field, type FormValues } from "@/lib/admin/fields";
import { initialValues, toPayload, validate } from "@/lib/admin/payload";
import type { ResourceDef } from "@/lib/admin/resources";
import { useAdmin } from "./admin-context";
import { FieldInput } from "./field-input";
import { Badge, Loading, Notice, PageHeader, Panel } from "./ui";

type Message = { tone: "error" | "success"; text: string };

/** API field keys (`coverId`) back to the form keys that show them (`cover`). */
function formKeyFor(fields: Field[], apiKey: string): string {
  const field = fields.find((f) => (f.kind === "media" || f.kind === "gallery") && f.key === apiKey);
  return field ? field.name : apiKey;
}

/**
 * Creates or edits one row of any resource in the registry. Everything about
 * the form comes from the resource's field list; nothing here knows what a
 * project or a testimonial is.
 */
export function ResourceForm({ resource, id, justCreated = false }: {
  resource: ResourceDef;
  id?: string;
  justCreated?: boolean;
}) {
  const router = useRouter();
  const { user } = useAdmin();
  const [row, setRow] = useState<AdminRow | null>(null);
  const [values, setValues] = useState<FormValues | null>(id ? null : initialValues(resource.fields));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<Message | null>(
    justCreated ? { tone: "success", text: `The ${resource.singular} was created. You can keep editing it here.` } : null,
  );
  const [busy, setBusy] = useState(false);
  // The id comes from the address bar; encoded, it cannot step out of its route.
  const safeId = id ? encodeURIComponent(id) : undefined;

  useEffect(() => {
    if (!safeId) return;
    let live = true;
    adminGet<AdminRow>(`/admin/${resource.name}/${safeId}`)
      .then((loaded) => {
        if (!live) return;
        setRow(loaded);
        setValues(initialValues(resource.fields, loaded));
      })
      .catch((e: Error) => live && setMessage({ tone: "error", text: e.message }));
    return () => {
      live = false;
    };
  }, [safeId, resource]);

  function change(key: string, value: unknown) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const rest = { ...current };
      delete rest[key];
      return rest;
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!values) return;
    const problems = validate(resource.fields, values);
    setErrors(problems);
    if (Object.keys(problems).length > 0) {
      setMessage({ tone: "error", text: "Some fields need attention." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const payload = toPayload(resource.fields, values, row);
      if (safeId) {
        const saved = await adminSend<AdminRow>("PATCH", `${resource.writePath}/${safeId}`, payload);
        // The reply is the bare row; keep the loaded relations (images) and take
        // the rest, so the Published badge and the site link are current.
        setRow((current) => (current && saved ? { ...current, ...saved } : current));
        setMessage({ tone: "success", text: "Saved. The site shows the change within moments." });
      } else {
        const created = await adminSend<{ id: string }>("POST", resource.writePath, payload);
        router.push(`/admins/${resource.name}/${created.id}?created=1`);
      }
    } catch (e) {
      const error = e as Error & { fieldErrors?: Record<string, string> };
      const fieldErrors: Record<string, string> = {};
      for (const [key, text] of Object.entries(error.fieldErrors ?? {})) fieldErrors[formKeyFor(resource.fields, key)] = text;
      setErrors(fieldErrors);
      setMessage({ tone: "error", text: error.message || "Saving failed." });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!safeId || !window.confirm(`Delete this ${resource.singular}? This cannot be undone.`)) return;
    try {
      await adminSend("DELETE", `${resource.writePath}/${safeId}`);
      router.push(`/admins/${resource.name}`);
    } catch (e) {
      setMessage({ tone: "error", text: (e as Error).message });
    }
  }

  const title = id ? (row ? resource.title(row) || `Untitled ${resource.singular}` : "Loading…") : `New ${resource.singular}`;
  const publicPath = row && resource.publicPath && row.published !== false ? resource.publicPath(row) : null;

  return (
    <>
      <Link href={`/admins/${resource.name}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink/70 hover:text-ink">
        <ArrowLeft aria-hidden="true" className="size-4" /> {resource.label}
      </Link>
      <PageHeader
        eyebrow={resource.label}
        title={title}
        description={resource.intro}
        actions={
          <>
            {row && "published" in row ? (
              <Badge tone={row.published ? "good" : "muted"}>{row.published ? "Published" : "Draft"}</Badge>
            ) : null}
            {publicPath ? (
              <a href={publicPath} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm underline-offset-4 hover:underline">
                <ExternalLink aria-hidden="true" className="size-4" /> View on the site
              </a>
            ) : null}
          </>
        }
      />

      {!values ? (message ? <Notice tone="error">{message.text}</Notice> : <Loading />) : (
        <form onSubmit={submit} noValidate className="flex flex-col gap-6">
          {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
          <Panel>
            <div className="grid gap-x-8 gap-y-6 lg:grid-cols-2">
              {resource.fields.map((field) => {
                const wide = field.wide || (field.kind !== "boolean" && keysOf(field).length > 1) || field.kind === "gallery";
                return (
                  <div key={field.name} className={wide ? "lg:col-span-2" : undefined}>
                    <FieldInput field={field} values={values} errors={errors} onChange={change} />
                  </div>
                );
              })}
            </div>
          </Panel>
          <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center justify-between gap-4 border-t border-ink/10 bg-bone/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12">
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : id ? "Save changes" : `Create ${resource.singular}`}
            </Button>
            {id && user.role === "ADMIN" ? (
              <button type="button" onClick={remove} className="text-sm text-[#9B2C1F] underline-offset-4 hover:underline">
                Delete {resource.singular}
              </button>
            ) : null}
          </div>
        </form>
      )}
    </>
  );
}
