"use client";

import { Button } from "@homeinn/ui";
import { ArrowLeft, Mail, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { adminGet, adminSend } from "@/lib/admin/api";
import { LEAD_STATUSES, STATUS_LABEL, STATUS_TONE, TYPE_LABEL, type AdminLead, type LeadStatus } from "@/lib/admin/leads";
import { whatsappHref } from "@/lib/whatsapp";
import { useAdmin } from "./admin-context";
import { Badge, controlClass, FieldShell, fullDate, Loading, Notice, PageHeader, Panel } from "./ui";

/** Only a path on this site becomes a link; anything else is shown as text. */
function isLocalPath(path: string): boolean {
  return /^\/(?![/\\])/.test(path);
}

export function EnquiryDetail({ id }: { id: string }) {
  // The id comes from the address bar; encoded, a crafted "../users/x" stays
  // inside /leads/ instead of reaching another route.
  const leadPath = `/leads/${encodeURIComponent(id)}`;
  const router = useRouter();
  const { user } = useAdmin();
  const [lead, setLead] = useState<AdminLead | null>(null);
  const [status, setStatus] = useState<LeadStatus>("NEW");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    adminGet<AdminLead>(leadPath)
      .then((row) => {
        if (!live) return;
        setLead(row);
        setStatus(row.status);
        setNotes(row.internalNotes ?? "");
      })
      .catch((e: Error) => live && setMessage({ tone: "error", text: e.message }));
    return () => {
      live = false;
    };
  }, [leadPath]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const saved = await adminSend<AdminLead>("PATCH", leadPath, { status, internalNotes: notes });
      setLead((current) => (current ? { ...current, ...saved } : saved));
      setMessage({ tone: "success", text: "Saved." });
    } catch (e) {
      setMessage({ tone: "error", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("Delete this enquiry for good? Use this for spam and test messages only.")) return;
    try {
      await adminSend("DELETE", leadPath);
      router.push("/admins/enquiries");
    } catch (e) {
      setMessage({ tone: "error", text: (e as Error).message });
    }
  }

  if (!lead) return message ? <Notice tone="error">{message.text}</Notice> : <Loading label="Loading the enquiry" />;

  return (
    <>
      <Link href="/admins/enquiries" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink/70 hover:text-ink">
        <ArrowLeft aria-hidden="true" className="size-4" /> All enquiries
      </Link>
      <PageHeader
        eyebrow={`${TYPE_LABEL[lead.type] ?? lead.type} enquiry`}
        title={lead.name}
        description={<>Received {fullDate(lead.createdAt)}</>}
        actions={<Badge tone={STATUS_TONE[lead.status]}>{STATUS_LABEL[lead.status]}</Badge>}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-6">
          <Panel>
            <h2 className="mb-3 text-xs uppercase tracking-[0.14em] text-ink/65">Message</h2>
            <p className="whitespace-pre-wrap text-base leading-relaxed">{lead.message || "They left no message, only their details."}</p>
          </Panel>

          <Panel>
            <form onSubmit={save} className="flex flex-col gap-5">
              <h2 className="text-xs uppercase tracking-[0.14em] text-ink/65">Where it stands</h2>
              {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
              <FieldShell id="lead-status" label="Status">
                <select id="lead-status" value={status} onChange={(e) => setStatus(e.target.value as LeadStatus)} className={controlClass}>
                  {LEAD_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </FieldShell>
              <FieldShell id="lead-notes" label="Internal notes" help="Only people with an admin account see these.">
                <textarea
                  id="lead-notes" rows={5} value={notes} maxLength={4000}
                  onChange={(e) => setNotes(e.target.value)} className={controlClass}
                />
              </FieldShell>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
                {user.role === "ADMIN" ? (
                  <button type="button" onClick={remove} className="text-sm text-[#9B2C1F] underline-offset-4 hover:underline">
                    Delete enquiry
                  </button>
                ) : null}
              </div>
            </form>
          </Panel>
        </div>

        <aside className="flex flex-col gap-6">
          <Panel>
            <h2 className="mb-4 text-xs uppercase tracking-[0.14em] text-ink/65">Reply</h2>
            <div className="flex flex-col gap-2">
              <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-2 border border-ink/15 bg-white px-3 py-2 text-sm hover:border-brand">
                <Phone aria-hidden="true" className="size-4 text-brand" /> Call {lead.phone}
              </a>
              <a href={whatsappHref(lead.phone)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 border border-ink/15 bg-white px-3 py-2 text-sm hover:border-brand">
                <MessageCircle aria-hidden="true" className="size-4 text-brand" /> WhatsApp
              </a>
              {lead.email ? (
                <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-2 border border-ink/15 bg-white px-3 py-2 text-sm hover:border-brand">
                  <Mail aria-hidden="true" className="size-4 text-brand" /> Email {lead.email}
                </a>
              ) : null}
            </div>
          </Panel>

          <Panel>
            <h2 className="mb-4 text-xs uppercase tracking-[0.14em] text-ink/65">Details</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-ink/65">Type</dt><dd>{TYPE_LABEL[lead.type] ?? lead.type}</dd>
              <dt className="text-ink/65">Service</dt><dd>{lead.service?.titleEn ?? "Not chosen"}</dd>
              <dt className="text-ink/65">Language</dt><dd>{lead.locale === "bn" ? "Bangla" : "English"}</dd>
              <dt className="text-ink/65">Page</dt>
              <dd className="break-all">
                {!lead.sourcePath ? "Unknown" : isLocalPath(lead.sourcePath) ? (
                  <a href={lead.sourcePath} target="_blank" rel="noreferrer" className="underline underline-offset-4">{lead.sourcePath}</a>
                ) : <span>{lead.sourcePath}</span>}
              </dd>
            </dl>
          </Panel>
        </aside>
      </div>
    </>
  );
}
