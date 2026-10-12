"use client";

import { Button } from "@homeinn/ui";
import { useEffect, useState, type FormEvent } from "react";
import { adminGet, adminSend } from "@/lib/admin/api";
import { keysOf, type FormValues } from "@/lib/admin/fields";
import { initialValues, toPayload, validate } from "@/lib/admin/payload";
import { SETTINGS_FIELDS } from "@/lib/admin/resources";
import { useAdmin } from "./admin-context";
import { FieldInput } from "./field-input";
import { Loading, Notice, PageHeader, Panel } from "./ui";

/** The one settings row: contact details, social links and the headline figures. */
export function SettingsForm() {
  const { user } = useAdmin();
  const canEdit = user.role === "ADMIN";
  const [values, setValues] = useState<FormValues | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    adminGet<Record<string, unknown>>("/settings")
      .then((row) => live && setValues(initialValues(SETTINGS_FIELDS, row)))
      .catch((e: Error) => live && setMessage({ tone: "error", text: e.message }));
    return () => {
      live = false;
    };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!values) return;
    const problems = validate(SETTINGS_FIELDS, values);
    setErrors(problems);
    if (Object.keys(problems).length > 0) {
      setMessage({ tone: "error", text: "Some fields need attention." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await adminSend("PATCH", "/settings", toPayload(SETTINGS_FIELDS, values));
      setMessage({ tone: "success", text: "Saved. The site shows the change within moments." });
    } catch (e) {
      const error = e as Error & { fieldErrors?: Record<string, string> };
      setErrors(error.fieldErrors ?? {});
      setMessage({ tone: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="The phone numbers, address and links shown across the site, and the figures in the home page's statement."
      />
      {!canEdit ? <div className="mb-6"><Notice tone="info">Only an admin can change these. You can read them here.</Notice></div> : null}
      {!values ? (message ? <Notice tone="error">{message.text}</Notice> : <Loading />) : (
        <form onSubmit={submit} noValidate className="flex flex-col gap-6">
          {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
          <Panel>
            <fieldset disabled={!canEdit} className="grid gap-x-8 gap-y-6 lg:grid-cols-2">
              {SETTINGS_FIELDS.map((field) => (
                <div key={field.name} className={keysOf(field).length > 1 ? "lg:col-span-2" : undefined}>
                  <FieldInput
                    field={field} values={values} errors={errors}
                    onChange={(key, value) => setValues((current) => ({ ...current, [key]: value }))}
                  />
                </div>
              ))}
            </fieldset>
          </Panel>
          {canEdit ? (
            <div>
              <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save settings"}</Button>
            </div>
          ) : null}
        </form>
      )}
    </>
  );
}
