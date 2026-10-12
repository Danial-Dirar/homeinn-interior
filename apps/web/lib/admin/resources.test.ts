import { describe, expect, it } from "vitest";
import { RESOURCES, resourceNamed, SETTINGS_FIELDS } from "./resources";

describe("the admin resource registry", () => {
  it("covers exactly the resources the API's admin read surface serves", () => {
    // apps/api/src/admin/admin.registry.ts — the two lists must not drift.
    expect(RESOURCES.map((r) => r.name).sort()).toEqual([
      "blog", "certifications", "client-logos", "corporate-clients", "hero", "products", "projects",
      "residential-clients", "services", "team", "testimonials", "working-areas",
    ]);
  });

  it("points every relation at a resource it knows", () => {
    for (const resource of RESOURCES) {
      for (const field of resource.fields) {
        if (field.kind === "relation") expect(resourceNamed(field.resource), `${resource.name}.${field.name}`).toBeDefined();
      }
    }
  });

  it("gives every resource a required field to call it by", () => {
    for (const resource of RESOURCES) {
      expect(resource.fields.some((f) => f.required), resource.name).toBe(true);
    }
  });

  it("never sends a settings link as null, which the API refuses; empty clears it", () => {
    for (const field of SETTINGS_FIELDS.filter((f) => f.kind === "url")) {
      expect("nullable" in field && field.nullable).toBeFalsy();
    }
  });

  it("lets imported projects and furniture be saved before anyone has written a description", () => {
    for (const name of ["projects", "products"]) {
      const field = resourceNamed(name)!.fields.find((f) => f.name === "description");
      expect(field?.required, name).toBeFalsy();
    }
  });

  it("lets settings be saved with no WhatsApp on the first line", () => {
    expect(SETTINGS_FIELDS.find((f) => f.name === "whatsapp")?.required).toBeFalsy();
  });
});
