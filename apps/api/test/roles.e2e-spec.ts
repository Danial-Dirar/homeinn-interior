import { INestApplication } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import * as argon2 from "argon2";
import { makeApp, resetDb } from "./setup-db";

/**
 * Two roles. The admin does everything. A moderator (stored as EDITOR) does
 * the day-to-day work — enquiries, prices, projects, furniture, people,
 * clients, the blog, images — but cannot change the site's structure
 * (services, working areas, the home page hero), its settings or its
 * accounts, and cannot delete anything.
 */
const prisma = new PrismaClient();
let app: INestApplication;
let admin: string[];
let moderator: string[];

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
      { email: "moderator@homeinn.test", name: "Moderator", role: "EDITOR", passwordHash },
    ],
  });
  admin = await login("admin@homeinn.test");
  moderator = await login("moderator@homeinn.test");
});

const server = () => app.getHttpServer();

async function login(email: string): Promise<string[]> {
  const res = await request(server()).post("/api/auth/login").send({ email, password: "hunter22ok" }).expect(200);
  return res.headers["set-cookie"] as unknown as string[];
}

const service = {
  titleEn: "Landscape", titleBn: "ল্যান্ডস্কেপ", summaryEn: "s", summaryBn: "s",
  bodyEn: "<p>b</p>", bodyBn: "<p>b</p>", icon: "sofa",
};

async function seed() {
  const area = await prisma.workingArea.create({ data: { slug: "residential", nameEn: "Residential", nameBn: "আবাসিক" } });
  const image = await prisma.media.create({
    data: { storageKey: "k", mimeType: "image/jpeg", width: 10, height: 10, bytes: 1, altEn: "a", altBn: "b" },
  });
  const svc = await prisma.service.create({ data: { slug: "interiors", ...service } });
  const hero = await prisma.heroSegment.create({
    data: { sortOrder: 0, imageId: image.id, labelEn: "Living", labelBn: "বসার ঘর" },
  });
  const product = await prisma.shopProduct.create({
    data: { slug: "chair", nameEn: "Chair", nameBn: "চেয়ার", summaryEn: "s", summaryBn: "s", descriptionEn: "", descriptionBn: "", priceBdt: 100 },
  });
  const project = await prisma.project.create({
    data: { slug: "p", titleEn: "P", titleBn: "প", locationEn: "", locationBn: "", descriptionEn: "", descriptionBn: "", workingAreaId: area.id },
  });
  const lead = await prisma.lead.create({ data: { type: "QUOTE", name: "Rahim", phone: "01760775454", locale: "bn" } });
  return { area, image, svc, hero, product, project, lead };
}

describe("a moderator", () => {
  it("can change a furniture price and the rest of a piece", async () => {
    const { product } = await seed();
    const res = await request(server()).patch(`/api/products/${product.id}`).set("Cookie", moderator)
      .send({ priceBdt: 2_450_000, published: true }).expect(200);
    expect(res.body.priceBdt).toBe(2_450_000);
  });

  it("can add and edit projects, answer enquiries and describe images", async () => {
    const { area, project, lead, image } = await seed();
    await request(server()).post("/api/projects").set("Cookie", moderator)
      .send({ titleEn: "New", titleBn: "নতুন", workingAreaId: area.id }).expect(201);
    await request(server()).patch(`/api/projects/${project.id}`).set("Cookie", moderator).send({ titleEn: "Renamed" }).expect(200);
    await request(server()).patch(`/api/leads/${lead.id}`).set("Cookie", moderator).send({ status: "CONTACTED" }).expect(200);
    await request(server()).patch(`/api/media/${image.id}`).set("Cookie", moderator).send({ altEn: "A chair", altBn: "চেয়ার" }).expect(200);
    await request(server()).post("/api/testimonials").set("Cookie", moderator)
      .send({ authorName: "Karim", quoteEn: "Good", quoteBn: "ভালো" }).expect(201);
  });

  it("cannot change the site's structure: services, working areas, the home page hero", async () => {
    const { svc, area, hero, image } = await seed();
    await request(server()).post("/api/services").set("Cookie", moderator).send(service).expect(403);
    await request(server()).patch(`/api/services/${svc.id}`).set("Cookie", moderator).send({ titleEn: "X" }).expect(403);
    await request(server()).post("/api/working-areas").set("Cookie", moderator).send({ nameEn: "X", nameBn: "ক" }).expect(403);
    await request(server()).patch(`/api/working-areas/${area.id}`).set("Cookie", moderator).send({ nameEn: "X" }).expect(403);
    await request(server()).post("/api/hero").set("Cookie", moderator)
      .send({ labelEn: "X", labelBn: "ক", imageId: image.id, sortOrder: 1 }).expect(403);
    await request(server()).patch(`/api/hero/${hero.id}`).set("Cookie", moderator).send({ active: false }).expect(403);
  });

  it("cannot change the settings or the accounts, or delete anything", async () => {
    const { project, product, lead } = await seed();
    await request(server()).patch("/api/settings").set("Cookie", moderator).send({ phone: "0" }).expect(403);
    await request(server()).get("/api/users").set("Cookie", moderator).expect(403);
    await request(server()).delete(`/api/projects/${project.id}`).set("Cookie", moderator).expect(403);
    await request(server()).delete(`/api/products/${product.id}`).set("Cookie", moderator).expect(403);
    await request(server()).delete(`/api/leads/${lead.id}`).set("Cookie", moderator).expect(403);
  });
});

describe("the admin", () => {
  it("can change the site's structure", async () => {
    const { svc, area, hero, image } = await seed();
    await request(server()).post("/api/services").set("Cookie", admin).send(service).expect(201);
    await request(server()).patch(`/api/services/${svc.id}`).set("Cookie", admin).send({ titleEn: "X" }).expect(200);
    await request(server()).post("/api/working-areas").set("Cookie", admin).send({ nameEn: "X", nameBn: "ক" }).expect(201);
    await request(server()).patch(`/api/working-areas/${area.id}`).set("Cookie", admin).send({ nameEn: "Y" }).expect(200);
    await request(server()).post("/api/hero").set("Cookie", admin)
      .send({ labelEn: "X", labelBn: "ক", imageId: image.id, sortOrder: 1 }).expect(201);
    await request(server()).patch(`/api/hero/${hero.id}`).set("Cookie", admin).send({ active: false }).expect(200);
  });
});
