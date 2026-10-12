import { describe, expect, it } from "vitest";
import { createClientLogoSchema, createProductSchema, createProjectSchema, updateProjectSchema } from "./content.js";

const project = {
  titleEn: "Villa", titleBn: "ভিলা", workingAreaId: "ckxxxxxxxxxxxxxxxxxxxxxxx",
};
const product = { nameEn: "Chair", nameBn: "চেয়ার", summaryEn: "s", summaryBn: "s" };

describe("write schemas the admin panel saves through", () => {
  it("accept a project with no description yet, as the imported photo projects have", () => {
    // Saving one of those to rename or publish it must not demand invented copy.
    expect(createProjectSchema.parse(project)).toMatchObject({ descriptionEn: "", descriptionBn: "" });
    expect(() => updateProjectSchema.parse({ descriptionEn: "", descriptionBn: "" })).not.toThrow();
  });

  it("accept a furniture piece with no long description; the site shows its summary", () => {
    expect(createProductSchema.parse(product)).toMatchObject({ descriptionEn: "", descriptionBn: "" });
  });

  it("refuse a price the database column cannot hold, rather than failing with a 500", () => {
    expect(() => createProductSchema.parse({ ...product, priceBdt: 2_147_483_647 })).not.toThrow();
    expect(() => createProductSchema.parse({ ...product, priceBdt: 2_147_483_648 })).toThrow();
  });

  it("accept only web addresses for a client's website", () => {
    const logo = { name: "Akij", logoId: "ckxxxxxxxxxxxxxxxxxxxxxxx" };
    expect(createClientLogoSchema.parse({ ...logo, website: "https://akij.net" }).website).toBe("https://akij.net");
    expect(() => createClientLogoSchema.parse({ ...logo, website: "javascript:alert(1)" })).toThrow();
  });
});
