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

function seedService(over: Record<string, unknown> = {}) {
  return prisma.service.create({
    data: {
      slug: "interior-design",
      titleEn: "Interior Design", titleBn: "ইন্টেরিয়র ডিজাইন",
      summaryEn: "Full-service interiors", summaryBn: "সম্পূর্ণ ইন্টেরিয়র",
      bodyEn: "<p>Body</p>", bodyBn: "<p>বডি</p>",
      icon: "sofa",
      published: true,
      ...over,
    } as never,
  });
}

function seedWorkingArea(over: Record<string, unknown> = {}) {
  return prisma.workingArea.create({
    data: { slug: "residential", nameEn: "Residential", nameBn: "আবাসিক", ...over } as never,
  });
}

function seedProject(workingAreaId: string, over: Record<string, unknown> = {}) {
  return prisma.project.create({
    data: {
      slug: "gulshan-flat",
      titleEn: "Gulshan Flat", titleBn: "গুলশান ফ্ল্যাট",
      locationEn: "Gulshan, Dhaka", locationBn: "গুলশান, ঢাকা",
      descriptionEn: "A flat", descriptionBn: "একটি ফ্ল্যাট",
      workingAreaId,
      published: true,
      ...over,
    } as never,
  });
}

const newService = {
  titleEn: "Gypsum Work", titleBn: "জিপসাম ওয়ার্ক",
  summaryEn: "Ceilings and partitions", summaryBn: "সিলিং ও পার্টিশন",
  bodyEn: "<p>Details</p>", bodyBn: "<p>বিস্তারিত</p>",
  icon: "layers",
};

describe("services", () => {
  it("lists only published services to the public", async () => {
    await seedService();
    await seedService({ slug: "draft-thing", titleEn: "Draft Thing", published: false });

    const res = await request(server()).get("/api/services").expect(200);

    expect(res.body.map((s: { slug: string }) => s.slug)).toEqual(["interior-design"]);
  });

  it("orders the public list by sortOrder", async () => {
    await seedService({ slug: "second", sortOrder: 2 });
    await seedService({ slug: "first", sortOrder: 1 });

    const res = await request(server()).get("/api/services").expect(200);

    expect(res.body.map((s: { slug: string }) => s.slug)).toEqual(["first", "second"]);
  });

  it("returns a published service by slug", async () => {
    await seedService();

    const res = await request(server()).get("/api/services/interior-design").expect(200);

    expect(res.body.titleBn).toBe("ইন্টেরিয়র ডিজাইন");
  });

  it("hides a draft behind a 404 rather than admitting it exists", async () => {
    await seedService({ slug: "draft-thing", published: false });

    await request(server()).get("/api/services/draft-thing").expect(404);
  });

  it("rejects an unauthenticated create with 401", async () => {
    await request(server()).post("/api/services").send(newService).expect(401);
    expect(await prisma.service.count()).toBe(0);
  });

  it("creates a service with a slug derived from the English title", async () => {
    const res = await request(server())
      .post("/api/services")
      .set("Cookie", await asAdmin())
      .send(newService)
      .expect(201);

    expect(res.body.slug).toBe("gypsum-work");
    expect(res.body.published).toBe(false); // drafts by default
  });

  it("suffixes the slug when the derived one is taken", async () => {
    const cookies = await asAdmin();
    await request(server()).post("/api/services").set("Cookie", cookies).send(newService).expect(201);

    const res = await request(server())
      .post("/api/services").set("Cookie", cookies).send(newService).expect(201);

    expect(res.body.slug).toBe("gypsum-work-2");
  });

  it("rejects a create that is missing the Bangla title with 400", async () => {
    const { titleBn: _titleBn, ...missing } = newService;

    await request(server())
      .post("/api/services").set("Cookie", await asAdmin()).send(missing).expect(400);
  });

  it("publishes a service through PATCH", async () => {
    const row = await seedService({ published: false });

    const res = await request(server())
      .patch(`/api/services/${row.id}`)
      .set("Cookie", await asAdmin())
      .send({ published: true })
      .expect(200);

    expect(res.body.published).toBe(true);
  });

  it("returns 404 when patching a service that does not exist", async () => {
    await request(server())
      .patch("/api/services/ckzzzzzzzzzzzzzzzzzzzzzzz")
      .set("Cookie", await asAdmin())
      .send({ published: true })
      .expect(404);
  });

  it("lets an admin delete a service", async () => {
    const row = await seedService();

    await request(server())
      .delete(`/api/services/${row.id}`).set("Cookie", await asAdmin()).expect(204);

    expect(await prisma.service.count()).toBe(0);
  });

  it("refuses a delete from an editor with 403", async () => {
    const row = await seedService();

    await request(server())
      .delete(`/api/services/${row.id}`).set("Cookie", await asEditor()).expect(403);

    expect(await prisma.service.count()).toBe(1);
  });

  it("lets an editor create a service", async () => {
    await request(server())
      .post("/api/services").set("Cookie", await asEditor()).send(newService).expect(201);
  });
});

describe("working areas", () => {
  it("lists every working area publicly, ordered by sortOrder", async () => {
    await seedWorkingArea({ slug: "commercial", nameEn: "Commercial", sortOrder: 2 });
    await seedWorkingArea({ slug: "residential", nameEn: "Residential", sortOrder: 1 });

    const res = await request(server()).get("/api/working-areas").expect(200);

    expect(res.body.map((w: { slug: string }) => w.slug)).toEqual(["residential", "commercial"]);
  });

  it("rejects an unauthenticated create with 401", async () => {
    await request(server())
      .post("/api/working-areas").send({ nameEn: "Resort", nameBn: "রিসোর্ট" }).expect(401);
  });

  it("creates a working area with a generated slug", async () => {
    const res = await request(server())
      .post("/api/working-areas")
      .set("Cookie", await asAdmin())
      .send({ nameEn: "Resort, Eco-Resort & Hotel", nameBn: "রিসোর্ট" })
      .expect(201);

    expect(res.body.slug).toBe("resort-eco-resort-hotel");
  });
});

describe("projects", () => {
  it("lists only published projects to the public", async () => {
    const area = await seedWorkingArea();
    await seedProject(area.id);
    await seedProject(area.id, { slug: "draft-project", published: false });

    const res = await request(server()).get("/api/projects").expect(200);

    expect(res.body.map((p: { slug: string }) => p.slug)).toEqual(["gulshan-flat"]);
  });

  it("puts featured projects first", async () => {
    const area = await seedWorkingArea();
    await seedProject(area.id, { slug: "ordinary", sortOrder: 1 });
    await seedProject(area.id, { slug: "highlight", sortOrder: 2, featured: true });

    const res = await request(server()).get("/api/projects").expect(200);

    expect(res.body.map((p: { slug: string }) => p.slug)).toEqual(["highlight", "ordinary"]);
  });

  it("filters the public list by working area slug", async () => {
    const residential = await seedWorkingArea();
    const commercial = await seedWorkingArea({ slug: "commercial", nameEn: "Commercial" });
    await seedProject(residential.id, { slug: "home-one" });
    await seedProject(commercial.id, { slug: "office-one" });

    const res = await request(server()).get("/api/projects?workingArea=commercial").expect(200);

    expect(res.body.map((p: { slug: string }) => p.slug)).toEqual(["office-one"]);
  });

  it("hides a draft project behind a 404", async () => {
    const area = await seedWorkingArea();
    await seedProject(area.id, { slug: "draft-project", published: false });

    await request(server()).get("/api/projects/draft-project").expect(404);
  });

  it("rejects an unauthenticated create with 401", async () => {
    const area = await seedWorkingArea();

    await request(server())
      .post("/api/projects")
      .send({
        titleEn: "New Villa", titleBn: "নতুন ভিলা",
        locationEn: "Uttara", locationBn: "উত্তরা",
        descriptionEn: "x", descriptionBn: "য",
        workingAreaId: area.id,
      })
      .expect(401);
  });

  it("creates a project against a working area", async () => {
    const area = await seedWorkingArea();

    const res = await request(server())
      .post("/api/projects")
      .set("Cookie", await asAdmin())
      .send({
        titleEn: "New Villa", titleBn: "নতুন ভিলা",
        locationEn: "Uttara", locationBn: "উত্তরা",
        descriptionEn: "x", descriptionBn: "য",
        workingAreaId: area.id, year: 2024, areaSqft: 3200,
      })
      .expect(201);

    expect(res.body.slug).toBe("new-villa");
    expect(res.body.workingAreaId).toBe(area.id);
  });
});
