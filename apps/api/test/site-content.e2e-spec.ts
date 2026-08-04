import { INestApplication } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import * as argon2 from "argon2";
import { makeApp, resetDb } from "./setup-db";

const prisma = new PrismaClient();
let app: INestApplication;

beforeAll(async () => {
  app = await makeApp();
});
afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

beforeEach(async () => {
  await resetDb(prisma);
  const passwordHash = await argon2.hash("hunter22ok", { type: argon2.argon2id });
  await prisma.adminUser.createMany({
    data: [
      { email: "admin@homeinn.test", name: "Admin", role: "ADMIN", passwordHash },
      { email: "editor@homeinn.test", name: "Editor", role: "EDITOR", passwordHash },
    ],
  });
});

const server = () => app.getHttpServer();

async function login(email: string): Promise<string[]> {
  const res = await request(server())
    .post("/api/auth/login")
    .send({ email, password: "hunter22ok" })
    .expect(200);
  return res.headers["set-cookie"] as unknown as string[];
}

const asAdmin = () => login("admin@homeinn.test");
const asEditor = () => login("editor@homeinn.test");

function seedMedia() {
  return prisma.media.create({
    data: {
      storageKey: "seed/hero.jpg", mimeType: "image/jpeg",
      width: 1920, height: 1080, bytes: 12_345,
      altEn: "A living room", altBn: "একটি বসার ঘর",
    },
  });
}

describe("clients — residential privacy", () => {
  const privateClient = {
    serial: 1, clientName: "Dr. Brig. Masud Ahmed",
    address: "Jolshiri Project, Purbachol, Dhaka", publiclyListed: false,
  };
  const consenting = {
    serial: 2, clientName: "Consenting Client",
    address: "Zinda Bazar, Sylhet", publiclyListed: true,
  };

  beforeEach(async () => {
    await prisma.residentialClient.createMany({ data: [privateClient, consenting] });
    await prisma.corporateClient.createMany({
      data: [
        { serial: 2, companyName: "Second Ltd", address: "Dhaka" },
        { serial: 1, companyName: "First Ltd", address: "Dhaka" },
      ],
    });
  });

  it("lists corporate clients publicly, ordered by serial", async () => {
    const res = await request(server()).get("/api/clients/corporate").expect(200);

    expect(res.body.map((c: { companyName: string }) => c.companyName))
      .toEqual(["First Ltd", "Second Ltd"]);
  });

  it("summarises residential clients as a count and districts, with no names", async () => {
    const res = await request(server()).get("/api/clients/residential-summary").expect(200);

    expect(res.body.total).toBe(2);
    expect(res.body.districts).toEqual(expect.arrayContaining(["Dhaka", "Sylhet"]));
    expect(JSON.stringify(res.body)).not.toContain("Masud");
  });

  it("never exposes a non-consenting residential name on any public route", async () => {
    for (const route of ["/api/clients/corporate", "/api/clients/residential-summary", "/api/clients/residential"]) {
      const res = await request(server()).get(route).expect(200);
      expect(JSON.stringify(res.body)).not.toContain("Masud Ahmed");
    }
  });

  it("lists only consenting residential clients", async () => {
    const res = await request(server()).get("/api/clients/residential").expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].clientName).toBe("Consenting Client");
  });
});

describe("hero", () => {
  beforeEach(async () => {
    const image = await seedMedia();
    await prisma.heroSegment.createMany({
      data: [
        { sortOrder: 0, imageId: image.id, labelEn: "Living", labelBn: "বসার", active: true, showOnMobile: true },
        { sortOrder: 1, imageId: image.id, labelEn: "Kitchen", labelBn: "রান্নাঘর", active: true, showOnMobile: false },
        { sortOrder: 2, imageId: image.id, labelEn: "Retired", labelBn: "পুরোনো", active: false, showOnMobile: true },
      ],
    });
  });

  it("returns every active segment by default", async () => {
    const res = await request(server()).get("/api/hero").expect(200);

    expect(res.body.map((s: { labelEn: string }) => s.labelEn)).toEqual(["Living", "Kitchen"]);
  });

  it("returns only mobile-flagged segments for ?target=mobile", async () => {
    const res = await request(server()).get("/api/hero?target=mobile").expect(200);

    expect(res.body.map((s: { labelEn: string }) => s.labelEn)).toEqual(["Living"]);
  });

  it("rejects an unknown target with 400", async () => {
    await request(server()).get("/api/hero?target=watch").expect(400);
  });

  it("rejects an unauthenticated create with 401", async () => {
    const image = await seedMedia();
    await request(server())
      .post("/api/hero")
      .send({ imageId: image.id, labelEn: "New", labelBn: "নতুন", sortOrder: 9 })
      .expect(401);
  });
});

describe("blog", () => {
  const post = {
    titleEn: "How We Work", titleBn: "আমরা যেভাবে কাজ করি",
    excerptEn: "Our process", excerptBn: "আমাদের প্রক্রিয়া",
    bodyEn: "<p>Long</p>", bodyBn: "<p>লম্বা</p>",
  };

  it("hides drafts and future-dated posts from the public list", async () => {
    await prisma.blogPost.createMany({
      data: [
        { slug: "live", ...post, published: true, publishedAt: new Date(Date.now() - 86_400_000) },
        { slug: "scheduled", ...post, published: true, publishedAt: new Date(Date.now() + 86_400_000) },
        { slug: "draft", ...post, published: false },
      ],
    });

    const res = await request(server()).get("/api/blog").expect(200);

    expect(res.body.map((p: { slug: string }) => p.slug)).toEqual(["live"]);
  });

  it("hides a draft behind a 404", async () => {
    await prisma.blogPost.create({ data: { slug: "draft", ...post, published: false } });

    await request(server()).get("/api/blog/draft").expect(404);
  });

  it("stamps publishedAt when a post is created already published", async () => {
    const res = await request(server())
      .post("/api/blog")
      .set("Cookie", await asAdmin())
      .send({ ...post, published: true })
      .expect(201);

    expect(res.body.publishedAt).not.toBeNull();
    const list = await request(server()).get("/api/blog").expect(200);
    expect(list.body.map((p: { slug: string }) => p.slug)).toEqual(["how-we-work"]);
  });

  it("rejects an unauthenticated create with 401", async () => {
    await request(server()).post("/api/blog").send(post).expect(401);
  });
});

describe("testimonials, team, certifications", () => {
  it("hides unpublished testimonials from the public list", async () => {
    await prisma.testimonial.createMany({
      data: [
        { authorName: "Shown", quoteEn: "Great", quoteBn: "দারুণ", published: true, sortOrder: 0 },
        { authorName: "Hidden", quoteEn: "Draft", quoteBn: "খসড়া", published: false, sortOrder: 1 },
      ],
    });

    const res = await request(server()).get("/api/testimonials").expect(200);

    expect(res.body.map((t: { authorName: string }) => t.authorName)).toEqual(["Shown"]);
  });

  it("hides unpublished team members from the public list", async () => {
    await prisma.teamMember.createMany({
      data: [
        { name: "Shown", roleEn: "Lead", roleBn: "প্রধান", published: true, sortOrder: 0 },
        { name: "Hidden", roleEn: "New", roleBn: "নতুন", published: false, sortOrder: 1 },
      ],
    });

    const res = await request(server()).get("/api/team").expect(200);

    expect(res.body.map((m: { name: string }) => m.name)).toEqual(["Shown"]);
  });

  it("lists certifications publicly in sort order", async () => {
    await prisma.certification.createMany({
      data: [
        { titleEn: "VAT", titleBn: "ভ্যাট", reference: "BIN 001489494-0804", sortOrder: 2 },
        { titleEn: "Trade Licence", titleBn: "ট্রেড লাইসেন্স", sortOrder: 1 },
      ],
    });

    const res = await request(server()).get("/api/certifications").expect(200);

    expect(res.body.map((c: { titleEn: string }) => c.titleEn)).toEqual(["Trade Licence", "VAT"]);
  });

  it("rejects unauthenticated writes with 401", async () => {
    await request(server()).post("/api/testimonials")
      .send({ authorName: "X", quoteEn: "q", quoteBn: "ক" }).expect(401);
    await request(server()).post("/api/team")
      .send({ name: "X", roleEn: "r", roleBn: "র" }).expect(401);
    await request(server()).post("/api/certifications")
      .send({ titleEn: "t", titleBn: "ট" }).expect(401);
  });
});

describe("settings", () => {
  it("answers publicly on a fresh database instead of 404ing", async () => {
    const res = await request(server()).get("/api/settings").expect(200);

    expect(res.body.id).toBe("singleton");
    expect(res.body.establishedYear).toBe(2015);
  });

  it("rejects an unauthenticated update with 401", async () => {
    await request(server()).patch("/api/settings").send({ phone: "+8801700000000" }).expect(401);
  });

  it("refuses an update from an editor with 403", async () => {
    await request(server())
      .patch("/api/settings").set("Cookie", await asEditor())
      .send({ phone: "+8801700000000" }).expect(403);
  });

  it("lets an admin update the singleton without creating a second row", async () => {
    const res = await request(server())
      .patch("/api/settings")
      .set("Cookie", await asAdmin())
      .send({ phone: "+8801700000000", districtCount: 13 })
      .expect(200);

    expect(res.body.phone).toBe("+8801700000000");
    expect(res.body.districtCount).toBe(13);
    expect(await prisma.siteSettings.count()).toBe(1);
  });

  it("rejects a malformed email with 400", async () => {
    await request(server())
      .patch("/api/settings").set("Cookie", await asAdmin())
      .send({ email: "not-an-email" }).expect(400);
  });
});
