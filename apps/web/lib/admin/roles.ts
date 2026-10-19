import type { Role } from "@homeinn/types";
import type { ResourceDef } from "./resources";

/**
 * Two roles. The database calls the second one EDITOR; the panel calls it
 * Moderator, which is what it is: day-to-day work — enquiries, prices,
 * projects, furniture, people, clients, the blog, images — without the
 * site's structure (services, working areas, the home page hero), its
 * settings, its accounts, or deleting anything. The API enforces the same
 * split (test/roles.e2e-spec.ts); this only keeps the panel honest about it.
 */
export const ROLE_LABEL: Record<Role, string> = { ADMIN: "Admin", EDITOR: "Moderator" };

export function canEdit(resource: Pick<ResourceDef, "adminOnly">, role: Role): boolean {
  return role === "ADMIN" || !resource.adminOnly;
}
