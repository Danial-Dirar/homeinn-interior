/** The inbox's vocabulary, in one place. */

export const LEAD_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const STATUS_LABEL: Record<LeadStatus, string> = {
  NEW: "New", CONTACTED: "Contacted", QUALIFIED: "Qualified", WON: "Won", LOST: "Lost",
};

export const STATUS_TONE: Record<LeadStatus, "brand" | "neutral" | "warn" | "good" | "muted"> = {
  NEW: "brand", CONTACTED: "neutral", QUALIFIED: "warn", WON: "good", LOST: "muted",
};

export const TYPE_LABEL: Record<string, string> = {
  CONTACT: "Contact", CONSULTATION: "Consultation", QUOTE: "Quote",
};

export interface AdminLead {
  id: string;
  type: string;
  status: LeadStatus;
  name: string;
  phone: string;
  email: string | null;
  message: string | null;
  locale: string;
  sourcePath: string | null;
  internalNotes: string | null;
  createdAt: string;
  service: { id: string; titleEn: string; titleBn: string } | null;
}
