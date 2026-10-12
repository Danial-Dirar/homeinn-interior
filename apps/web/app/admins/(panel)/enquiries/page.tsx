import type { Metadata } from "next";
import { Inbox, type InboxFilter } from "@/components/admin/inbox";
import { LEAD_STATUSES } from "@/lib/admin/leads";

export const metadata: Metadata = { title: "Enquiries" };

export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { status, page } = await searchParams;
  const filter: InboxFilter = status === "ALL" || (LEAD_STATUSES as readonly string[]).includes(status ?? "")
    ? (status as InboxFilter)
    : "NEW";
  const pageNumber = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);
  return <Inbox status={filter} page={pageNumber} />;
}
