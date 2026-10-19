"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { adminGet } from "@/lib/admin/api";
import { STATUS_LABEL, STATUS_TONE, TYPE_LABEL, type AdminLead } from "@/lib/admin/leads";
import { RESOURCES } from "@/lib/admin/resources";
import { canEdit } from "@/lib/admin/roles";
import { useAdmin } from "./admin-context";
import { Badge, Loading, Notice, PageHeader, Panel, timeAgo } from "./ui";

interface Summary {
  leads: Record<string, number>;
  recentLeads: Pick<AdminLead, "id" | "type" | "status" | "name" | "phone" | "createdAt" | "service">[];
  content: Record<string, { total: number; drafts?: number }>;
}

function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * What needs doing, said in sentences rather than a wall of big numbers:
 * enquiries waiting first, then drafts that are not on the site yet.
 */
export function Overview() {
  const { user } = useAdmin();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    adminGet<Summary>("/admin/summary")
      .then((s) => live && setSummary(s))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, []);

  const firstName = user.name.split(" ")[0];
  const waiting = summary?.leads.NEW ?? 0;
  const mine = RESOURCES.filter((r) => canEdit(r, user.role));
  const drafts = summary
    ? mine.map((r) => ({ resource: r, count: summary.content[r.name]?.drafts ?? 0 })).filter((d) => d.count > 0)
    : [];

  return (
    <>
      <PageHeader title={`${greeting(new Date().getHours())}, ${firstName}.`} description="Here is what needs your attention." />
      {error ? <Notice tone="error">{error}</Notice> : null}
      {!summary && !error ? <Loading /> : null}

      {summary ? (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Panel>
            <h2 className="mb-3 text-xs uppercase tracking-[0.14em] text-ink/65">Enquiries</h2>
            {waiting > 0 ? (
              <p className="font-display text-2xl leading-snug">
                {plural(waiting, "enquiry is", "enquiries are")} waiting for a reply.{" "}
                <Link href="/admins/enquiries?status=NEW" className="font-sans text-base text-brand underline underline-offset-4">Answer them</Link>
              </p>
            ) : (
              <p className="font-display text-2xl leading-snug">No enquiries are waiting. Everything has been answered.</p>
            )}

            {summary.recentLeads.length > 0 ? (
              <>
                <h3 className="mb-2 mt-8 text-sm font-medium">Latest</h3>
                <ul className="divide-y divide-ink/[0.08] border-y border-ink/[0.08]">
                  {summary.recentLeads.map((lead) => (
                    <li key={lead.id}>
                      <Link href={`/admins/enquiries/${lead.id}`} className="flex items-center gap-3 py-3 hover:bg-white">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{lead.name}</span>
                          <span className="block truncate text-xs text-ink/65">
                            {TYPE_LABEL[lead.type] ?? lead.type}{lead.service ? ` · ${lead.service.titleEn}` : ""} · {timeAgo(lead.createdAt)}
                          </span>
                        </span>
                        <Badge tone={STATUS_TONE[lead.status]}>{STATUS_LABEL[lead.status]}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link href="/admins/enquiries?status=ALL" className="mt-4 inline-flex items-center gap-1.5 text-sm underline-offset-4 hover:underline">
                  Every enquiry <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </>
            ) : null}
          </Panel>

          <div className="flex flex-col gap-6">
            <Panel>
              <h2 className="mb-3 text-xs uppercase tracking-[0.14em] text-ink/65">Not on the site yet</h2>
              {drafts.length > 0 ? (
                <>
                  <p className="mb-3 text-sm text-ink/75">These are saved as drafts. Tick “Published” to put them live.</p>
                  <ul className="flex flex-col gap-1.5 text-sm">
                    {drafts.map(({ resource, count }) => (
                      <li key={resource.name}>
                        <Link href={`/admins/${resource.name}`} className="underline underline-offset-4">
                          {plural(count, resource.singular, resource.label.toLowerCase())}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-sm text-ink/75">Nothing. Every saved item is published.</p>
              )}
            </Panel>

            <Panel>
              <h2 className="mb-3 text-xs uppercase tracking-[0.14em] text-ink/65">Edit the site</h2>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {mine.map((resource) => (
                  <li key={resource.name}>
                    <Link href={`/admins/${resource.name}`} className="inline-flex items-center gap-2 hover:text-brand">
                      <resource.icon aria-hidden="true" className="size-4 text-ink/65" />
                      {resource.label}
                      <span className="text-ink/65">{summary.content[resource.name]?.total ?? 0}</span>
                    </Link>
                  </li>
                ))}
                <li><Link href="/admins/media" className="hover:text-brand">Media library</Link></li>
                {user.role === "ADMIN" ? (
                  <li><Link href="/admins/settings" className="hover:text-brand">Contact details</Link></li>
                ) : null}
              </ul>
            </Panel>
          </div>
        </div>
      ) : null}
    </>
  );
}
