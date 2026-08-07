import { createLeadSchema, type CreateLeadInput } from "@homeinn/types";
import { apiBaseUrl } from "./env";

export type LeadResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "throttled" | "network" };

/**
 * Posts a lead from the browser straight to the API.
 *
 * Deliberately not a Server Action: `POST /api/leads` is capped at 5 per hour
 * per IP, and proxying through the Next server would put every visitor in the
 * country behind one IP and one shared budget.
 *
 * Validation uses the API's own schema, so the phone normalisation the server
 * applies (+880 → 0, separators stripped) happens identically here.
 */
export async function submitLead(input: unknown): Promise<LeadResult> {
  const parsed = createLeadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };

  let response: { ok: boolean; status: number };
  try {
    response = await fetch(`${apiBaseUrl()}/leads`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsed.data satisfies CreateLeadInput),
    });
  } catch {
    return { ok: false, reason: "network" };
  }

  if (response.ok) return { ok: true };
  if (response.status === 429) return { ok: false, reason: "throttled" };
  return { ok: false, reason: "network" };
}
