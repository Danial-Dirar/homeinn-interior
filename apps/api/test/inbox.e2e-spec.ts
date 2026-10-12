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

async function login(email = "admin@homeinn.test"): Promise<string[]> {
  const res = await request(server()).post("/api/auth/login").send({ email, password: "hunter22ok" }).expect(200);
  return res.headers["set-cookie"] as unknown as string[];
}

function seedLead(over: Record<string, unknown> = {}) {
  return prisma.lead.create({
    data: { type: "CONTACT", name: "Seed", phone: "01760775454", locale: "en", ...over } as never,
  });
}

describe("the enquiry inbox", () => {
  it("filters by status, so 'who has not been answered' is one request", async () => {
    await seedLead({ name: "Waiting" });
    await seedLead({ name: "Answered", status: "CONTACTED" });
    const cookies = await login();

    const res = await request(server()).get("/api/leads?status=NEW").set("Cookie", cookies).expect(200);

    expect(res.body.items.map((l: { name: string }) => l.name)).toEqual(["Waiting"]);
    expect(res.body.total).toBe(1);
  });

  it("names the service each enquiry asked about", async () => {
    const service = await prisma.service.create({
      data: {
        slug: "interior-design", titleEn: "Interior Design", titleBn: "ইন্টেরিয়র ডিজাইন",
        summaryEn: "s", summaryBn: "s", bodyEn: "b", bodyBn: "b", icon: "sofa",
      },
    });
    await seedLead({ serviceId: service.id });
    const cookies = await login();

    const res = await request(server()).get("/api/leads").set("Cookie", cookies).expect(200);

    expect(res.body.items[0].service).toEqual({ id: service.id, titleEn: "Interior Design", titleBn: "ইন্টেরিয়র ডিজাইন" });
  });

  it("opens one enquiry by id", async () => {
    const lead = await seedLead({ name: "Karim", message: "A whole flat, please." });
    const cookies = await login();

    const res = await request(server()).get(`/api/leads/${lead.id}`).set("Cookie", cookies).expect(200);

    expect(res.body).toMatchObject({ name: "Karim", message: "A whole flat, please.", service: null });
  });

  it("returns 404 for an enquiry that does not exist", async () => {
    const cookies = await login();
    await request(server()).get("/api/leads/ckxxxxxxxxxxxxxxxxxxxxxxx").set("Cookie", cookies).expect(404);
  });

  it("keeps a single enquiry behind a session", async () => {
    const lead = await seedLead();
    await request(server()).get(`/api/leads/${lead.id}`).expect(401);
  });

  it("lets an admin delete an enquiry, such as spam", async () => {
    const lead = await seedLead();
    const cookies = await login();
    await request(server()).delete(`/api/leads/${lead.id}`).set("Cookie", cookies).expect(204);
    expect(await prisma.lead.count()).toBe(0);
  });

  it("does not let an editor delete an enquiry", async () => {
    const lead = await seedLead();
    const cookies = await login("editor@homeinn.test");
    await request(server()).delete(`/api/leads/${lead.id}`).set("Cookie", cookies).expect(403);
  });
});

describe("the media library", () => {
  function seedMedia(altEn: string) {
    return prisma.media.create({
      data: { storageKey: `k-${altEn}`, mimeType: "image/jpeg", width: 1000, height: 800, bytes: 1, altEn, altBn: "বাংলা" },
    });
  }

  it("corrects alt text in both languages", async () => {
    const media = await seedMedia("A sofa");
    const cookies = await login("editor@homeinn.test");

    const res = await request(server())
      .patch(`/api/media/${media.id}`)
      .set("Cookie", cookies)
      .send({ altEn: "A green sofa by the window", altBn: "জানালার পাশে সবুজ সোফা" })
      .expect(200);

    expect(res.body).toMatchObject({ altEn: "A green sofa by the window", altBn: "জানালার পাশে সবুজ সোফা" });
    expect(res.body.sources).toHaveLength(2);
  });

  it("never accepts an empty alt text", async () => {
    const media = await seedMedia("A sofa");
    const cookies = await login();
    await request(server())
      .patch(`/api/media/${media.id}`)
      .set("Cookie", cookies)
      .send({ altEn: "", altBn: "বাংলা" })
      .expect(400);
  });

  it("finds images by their alt text", async () => {
    await seedMedia("Brick villa front");
    await seedMedia("Office reception");
    const cookies = await login();

    const res = await request(server()).get("/api/media?q=villa").set("Cookie", cookies).expect(200);

    expect(res.body.items.map((m: { altEn: string }) => m.altEn)).toEqual(["Brick villa front"]);
    expect(res.body.total).toBe(1);
  });
});
