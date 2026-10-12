import { PrismaClient } from "@prisma/client";
import { seed } from "../prisma/seed";
import { resetDb } from "./setup-db";

const prisma = new PrismaClient();

// Seeded twice on purpose: every assertion below therefore also proves the seed
// is idempotent, rather than relying on the operator to have run it twice.
beforeAll(async () => {
  await resetDb(prisma);
  await seed(prisma);
  await seed(prisma);
}, 60_000);

afterAll(async () => {
  await prisma.$disconnect();
});

describe("seed data", () => {
  // The profile lists 7; its "2D Plan & Solution" and "3D Model & Visualization"
  // were merged into one on 2026-08-10 (see seed-data/services.ts).
  it("creates the 6 services: the profile's 7 with 2D and 3D merged", async () => {
    expect(await prisma.service.count()).toBe(6);
  });

  // The profile's 9, plus `factory-works` added on 2026-08-09 for the archive.
  it("creates the 10 working areas: the profile's 9 plus factory works", async () => {
    expect(await prisma.workingArea.count()).toBe(10);
  });

  it("translates every working area rather than repeating the English", async () => {
    const areas = await prisma.workingArea.findMany();
    expect(areas.every((a) => a.nameBn !== a.nameEn && a.nameBn.length > 0)).toBe(true);
  });

  it("publishes the services so the public list is not empty", async () => {
    expect(await prisma.service.count({ where: { published: true } })).toBe(6);
  });

  it("creates the 3 credentials from the profile", async () => {
    const certs = await prisma.certification.findMany({ orderBy: { sortOrder: "asc" } });
    expect(certs.map((c) => c.titleEn))
      .toEqual(["Trade License", "VAT Registration", "TIN Certificate"]);
    expect(certs.find((c) => c.titleEn === "VAT Registration")?.reference)
      .toBe("BIN 001489494-0804");
  });

  it("creates exactly one admin user", async () => {
    const admins = await prisma.adminUser.findMany();
    expect(admins).toHaveLength(1);
    expect(admins[0]!.role).toBe("ADMIN");
  });

  it("stores the admin password as an argon2id hash, not plaintext", async () => {
    const admin = await prisma.adminUser.findFirstOrThrow();
    expect(admin.passwordHash.startsWith("$argon2id$")).toBe(true);
  });

  it("leaves every residential row unlisted by default", async () => {
    expect(await prisma.residentialClient.count({ where: { publiclyListed: true } })).toBe(0);
  });

  it("seeds no testimonials and no team members", async () => {
    expect(await prisma.testimonial.count()).toBe(0);
    expect(await prisma.teamMember.count()).toBe(0);
  });

  it("records the established year and true project counts in settings", async () => {
    const s = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
    expect(s?.establishedYear).toBe(2015);
    expect(s?.corporateProjectCount).toBe(73);
    expect(s?.residentialProjectCount).toBe(57);
    expect(s?.districtCount).toBe(13);
    expect(s?.phone).toBe("01760775454");
    expect(s?.email).toBe("homeinnbd14@gmail.com");
  });

  // Blocked: the company profile PDF is not in this repository and spec §2 records
  // only the counts, not the rows. See prisma/seed-data/corporate-clients.ts.
  it.todo("creates 73 corporate rows — needs the profile PDF transcription");
  it.todo("creates 57 residential rows — needs the profile PDF transcription");
  it.todo("marks residential rows 17 and 33 as needing verification");
});
