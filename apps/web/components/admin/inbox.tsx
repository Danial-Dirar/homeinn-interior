"use client";

import { cn } from "@homeinn/ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import { adminGet } from "@/lib/admin/api";
import { LEAD_STATUSES, STATUS_LABEL, STATUS_TONE, TYPE_LABEL, type AdminLead, type LeadStatus } from "@/lib/admin/leads";
import { Badge, EmptyState, Loading, Notice, PageHeader, timeAgo } from "./ui";

export type InboxFilter = LeadStatus | "ALL";

const PER_PAGE = 25;

const EMPTY: Record<InboxFilter, string> = {
  NEW: "Nothing here. Every enquiry has been answered.",
  CONTACTED: "No enquiries are marked as contacted.",
  QUALIFIED: "No enquiries are marked as qualified.",
  WON: "No won enquiries yet.",
  LOST: "No lost enquiries.",
  ALL: "No enquiries yet. They arrive here from the contact form on the site.",
};

/**
 * Enquiries from the site's forms. Opens on "New": the question this page
 * exists to answer is who has not been answered yet.
 */
export function Inbox({ status, page }: { status: InboxFilter; page: number }) {
  const [data, setData] = useState<{ items: AdminLead[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setData(null);
    const query = new URLSearchParams({
      ...(status === "ALL" ? {} : { status }),
      page: String(page),
      perPage: String(PER_PAGE),
    });
    adminGet<{ items: AdminLead[]; total: number }>(`/leads?${query}`)
      .then((res) => live && setData(res))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [status, page]);

  const pages = data ? Math.max(1, Math.ceil(data.total / PER_PAGE)) : 1;
  const tabs: InboxFilter[] = [...LEAD_STATUSES, "ALL"];

  return (
    <>
      <PageHeader
        title="Enquiries"
        description="Messages from the contact, consultation and quote forms on the site. Call or WhatsApp from an enquiry, then mark where it stands."
      />

      <nav aria-label="Filter by status" className="mb-6 flex flex-wrap gap-1 border-b border-ink/10">
        {tabs.map((tab) => (
          <Link
            key={tab}
            href={`/admins/enquiries?status=${tab}`}
            aria-current={tab === status ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-4 py-2.5 text-sm",
              tab === status ? "border-brand font-medium text-ink" : "border-transparent text-ink/70 hover:text-ink",
            )}
          >
            {tab === "ALL" ? "All" : STATUS_LABEL[tab]}
          </Link>
        ))}
      </nav>

      {error ? <Notice tone="error">{error}</Notice> : null}
      {!data && !error ? <Loading label="Loading enquiries" /> : null}
      {data && data.items.length === 0 ? <EmptyState>{EMPTY[status]}</EmptyState> : null}

      {data && data.items.length > 0 ? (
        <div className="overflow-x-auto border border-ink/10 bg-[#FBF8F3]">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <caption className="sr-only">Enquiries, newest first</caption>
            <thead className="border-b border-ink/10 text-xs uppercase tracking-[0.1em] text-ink/65">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Name</th>
                <th scope="col" className="px-4 py-3 font-medium">Phone</th>
                <th scope="col" className="px-4 py-3 font-medium">Asked for</th>
                <th scope="col" className="px-4 py-3 font-medium">Received</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((lead) => (
                <tr key={lead.id} className="border-b border-ink/[0.07] last:border-0 hover:bg-white">
                  <td className="px-4 py-3">
                    <Link href={`/admins/enquiries/${lead.id}`} className="font-medium underline-offset-4 hover:underline">
                      {lead.name}
                    </Link>
                    {lead.message ? <p className="mt-0.5 line-clamp-1 max-w-xs text-xs text-ink/65">{lead.message}</p> : null}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums">{lead.phone}</td>
                  <td className="px-4 py-3">
                    {TYPE_LABEL[lead.type] ?? lead.type}
                    {lead.service ? <span className="text-ink/65"> · {lead.service.titleEn}</span> : null}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink/70">
                    <time dateTime={lead.createdAt}>{timeAgo(lead.createdAt)}</time>
                  </td>
                  <td className="px-4 py-3"><Badge tone={STATUS_TONE[lead.status]}>{STATUS_LABEL[lead.status]}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {data && pages > 1 ? (
        <nav aria-label="Pages" className="mt-6 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link href={`/admins/enquiries?status=${status}&page=${page - 1}`} className="underline underline-offset-4">Newer</Link>
          ) : <span />}
          <span className="text-ink/65">Page {page} of {pages}</span>
          {page < pages ? (
            <Link href={`/admins/enquiries?status=${status}&page=${page + 1}`} className="underline underline-offset-4">Older</Link>
          ) : <span />}
        </nav>
      ) : null}
    </>
  );
}
