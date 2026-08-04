import { INestApplication } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { seed } from "../prisma/seed";
import { workingAreas } from "../prisma/seed-data/working-areas";
import { corporateClients } from "../prisma/seed-data/corporate-clients";
import { makeApp, resetDb } from "./setup-db";

const prisma = new PrismaClient();
let app: INestApplication;

/** A name that must never appear on a public route. */
const PRIVATE_CLIENT = "Dr. Brig. Masud Ahmed";

/**
 * The read surface Plan 1B consumes, asserted against a seeded database without
 * any auth cookie. Seeding happens here rather than out-of-band so the suite does
 * not depend on the operator, or on which other e2e file truncated last.
 */
beforeAll(async () => {
  app = await makeApp();
  await resetDb(prisma);
  await seed(prisma);

  // Fixtures the seed deliberately does not create, so the privacy and hero
  // assertions below are testing something rather than passing vacuously.
  await prisma.residentialClient.create({
    data: {
      serial: 900,
      clientName: PRIVATE_CLIENT,
      address: "Jolshiri Project, Purbachol, Dhaka",
      publiclyListed: false,
    },
  });
  const image = await prisma.media.create({
    data: {
      storageKey: "seed/hero.jpg", mimeType: "image/jpeg",
      width: 1920, height: 1080, bytes: 12_345,
      altEn: "A living room", altBn: "একটি বসার ঘর",
    },
  });
  await prisma.heroSegment.createMany({
    data: [
      { sortOrder: 0, imageId: image.id, labelEn: "Living", labelBn: "বসার", active: true, showOnMobile: true },
      { sortOrder: 1, imageId: image.id, labelEn: "Kitchen", labelBn: "রান্নাঘর", active: true, showOnMobile: false },
    ],
  });
}, 60_000);

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

const server = () => app.getHttpServer();

describe("public read surface", () => {
  it("answers the health check", async () => {
    const res = await request(server()).get("/api/health").expect(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("returns only published services", async () => {
    const res = await request(server()).get("/api/services").expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((s: { published: boolean }) => s.published)).toBe(true);
  });

  it("returns every seeded working area", async () => {
    const res = await request(server()).get("/api/working-areas").expect(200);

    expect(res.body).toHaveLength(workingAreas.length);
  });

  it("returns only published projects", async () => {
    const res = await request(server()).get("/api/projects").expect(200);

    expect(res.body.every((p: { published: boolean }) => p.published)).toBe(true);
  });

  it("returns every seeded corporate row", async () => {
    const res = await request(server()).get("/api/clients/corporate").expect(200);

    expect(res.body).toHaveLength(corporateClients.length);
  });

  it("returns a residential summary shaped as a count and district list", async () => {
    const res = await request(server()).get("/api/clients/residential-summary").expect(200);

    expect(typeof res.body.total).toBe("number");
    expect(Array.isArray(res.body.districts)).toBe(true);
    expect(res.body.districts).toContain("Dhaka");
  });

  it("returns only mobile-flagged hero segments for ?target=mobile", async () => {
    const res = await request(server()).get("/api/hero?target=mobile").expect(200);

    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((s: { showOnMobile: boolean }) => s.showOnMobile)).toBe(true);
  });

  it("returns the site settings with the established year", async () => {
    const res = await request(server()).get("/api/settings").expect(200);

    expect(res.body.establishedYear).toBe(2015);
    expect(res.body.email).toBe("homeinnbd14@gmail.com");
  });

  it("keeps the lead list behind auth", async () => {
    await request(server()).get("/api/leads").expect(401);
  });

  it("keeps media upload behind auth", async () => {
    await request(server()).post("/api/media").expect(401);
  });
});

describe("residential privacy", () => {
  it("never exposes a non-consenting residential client name on any public route", async () => {
    const routes = [
      "/api/clients/corporate", "/api/clients/residential-summary", "/api/clients/residential",
      "/api/projects", "/api/services", "/api/settings",
    ];

    for (const route of routes) {
      const res = await request(server()).get(route).expect(200);
      expect(JSON.stringify(res.body)).not.toContain(PRIVATE_CLIENT);
    }
  });

  it("returns no residential rows at all while none have consented", async () => {
    const res = await request(server()).get("/api/clients/residential").expect(200);

    expect(res.body).toEqual([]);
  });
});
