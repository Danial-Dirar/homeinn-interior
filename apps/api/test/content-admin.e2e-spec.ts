import { INestApplication } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import * as argon2 from "argon2";
import { makeApp, resetDb } from "./setup-db";

const prisma = new PrismaClient();
let app: INestApplication;
let admin: string[];
let editor: string[];

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
  admin = await login("admin@homeinn.test");
  editor = await login("editor@homeinn.test");
});

const server = () => app.getHttpServer();

async function login(email: string): Promise<string[]> {
  const res = await request(server()).post("/api/auth/login").send({ email, password: "hunter22ok" }).expect(200);
  return res.headers["set-cookie"] as unknown as string[];
}

function seedMedia(altEn = "An image") {
  return prisma.media.create({
    data: { storageKey: `k-${altEn}`, mimeType: "image/jpeg", width: 1000, height: 800, bytes: 1, altEn, altBn: "ছবি" },
  });
}

function seedArea(slug = "residential") {
  return prisma.workingArea.create({ data: { slug, nameEn: "Residential", nameBn: "আবাসিক" } });
}

const product = {
  nameEn: "Teak Armchair", nameBn: "সেগুন আর্মচেয়ার",
  summaryEn: "Solid teak", summaryBn: "নিরেট সেগুন",
  descriptionEn: "<p>Made in Dhaka.</p>", descriptionBn: "<p>ঢাকায় তৈরি।</p>",
};

describe("furniture", () => {
  it("can be added by an editor, with a slug from the English name and a price in poisha", async () => {
    const res = await request(server())
      .post("/api/products").set("Cookie", editor)
      .send({ ...product, priceBdt: 2_450_000, published: true })
      .expect(201);
    expect(res.body).toMatchObject({ slug: "teak-armchair", priceBdt: 2_450_000, published: true });
  });

  it("can be priced on request by clearing the price", async () => {
    const created = await request(server()).post("/api/products").set("Cookie", editor)
      .send({ ...product, priceBdt: 100 }).expect(201);
    const res = await request(server()).patch(`/api/products/${created.body.id}`).set("Cookie", editor)
      .send({ priceBdt: null }).expect(200);
    expect(res.body.priceBdt).toBeNull();
  });

  it("can be deleted by an admin but not by an editor", async () => {
    const created = await request(server()).post("/api/products").set("Cookie", admin).send(product).expect(201);
    await request(server()).delete(`/api/products/${created.body.id}`).set("Cookie", editor).expect(403);
    await request(server()).delete(`/api/products/${created.body.id}`).set("Cookie", admin).expect(204);
  });

  it("refuses writes without a session", async () => {
    await request(server()).post("/api/products").send(product).expect(401);
  });

  it("carries a second view of the piece, shown when the cover is hovered, and can drop it", async () => {
    // Muhammad, 2026-10-19: the cover at its real angle, the front view on hover.
    const cover = await seedMedia("Teak armchair, angled");
    const front = await seedMedia("Teak armchair, from the front");
    const created = await request(server()).post("/api/products").set("Cookie", editor)
      .send({ ...product, published: true, coverId: cover.id, secondViewId: front.id }).expect(201);

    const list = await request(server()).get("/api/products").expect(200);
    expect(list.body[0].secondView.altEn).toBe("Teak armchair, from the front");
    const detail = await request(server()).get("/api/products/teak-armchair").expect(200);
    expect(detail.body.secondView.altEn).toBe("Teak armchair, from the front");
    const edit = await request(server()).get(`/api/admin/products/${created.body.id}`).set("Cookie", editor).expect(200);
    expect(edit.body.secondView.altEn).toBe("Teak armchair, from the front");

    await request(server()).patch(`/api/products/${created.body.id}`).set("Cookie", editor)
      .send({ secondViewId: null }).expect(200);
    const after = await request(server()).get("/api/products/teak-armchair").expect(200);
    expect(after.body.secondView).toBeNull();
  });
});

describe("client logos", () => {
  it("can be added, renamed and removed", async () => {
    const logo = await seedMedia("BRAC Bank logo");
    const created = await request(server()).post("/api/client-logos").set("Cookie", editor)
      .send({ name: "BRAC Bank", website: "https://www.bracbank.com", logoId: logo.id }).expect(201);
    expect(created.body).toMatchObject({ name: "BRAC Bank", published: true });

    const renamed = await request(server()).patch(`/api/client-logos/${created.body.id}`).set("Cookie", editor)
      .send({ name: "BRAC Bank PLC", website: null }).expect(200);
    expect(renamed.body).toMatchObject({ name: "BRAC Bank PLC", website: null });

    await request(server()).delete(`/api/client-logos/${created.body.id}`).set("Cookie", admin).expect(204);
  });

  it("refuses a second logo with the same name", async () => {
    const logo = await seedMedia();
    await request(server()).post("/api/client-logos").set("Cookie", editor).send({ name: "Akij", logoId: logo.id }).expect(201);
    await request(server()).post("/api/client-logos").set("Cookie", editor).send({ name: "Akij", logoId: logo.id }).expect(409);
  });
});

describe("client lists", () => {
  it("corporate rows can be added, edited and removed", async () => {
    const created = await request(server()).post("/api/clients/corporate").set("Cookie", editor)
      .send({ serial: 74, companyName: "Sonali Bank", address: "Motijheel, Dhaka" }).expect(201);
    await request(server()).patch(`/api/clients/corporate/${created.body.id}`).set("Cookie", editor)
      .send({ isFlagship: true }).expect(200);
    await request(server()).delete(`/api/clients/corporate/${created.body.id}`).set("Cookie", admin).expect(204);
  });

  it("residential rows stay off the public list until marked publicly listed", async () => {
    const created = await request(server()).post("/api/clients/residential").set("Cookie", editor)
      .send({ serial: 58, clientName: "Mr. Private", address: "Gulshan, Dhaka" }).expect(201);
    let pub = await request(server()).get("/api/clients/residential").expect(200);
    expect(pub.body).toEqual([]);

    await request(server()).patch(`/api/clients/residential/${created.body.id}`).set("Cookie", editor)
      .send({ publiclyListed: true }).expect(200);
    pub = await request(server()).get("/api/clients/residential").expect(200);
    expect(pub.body.map((r: { clientName: string }) => r.clientName)).toEqual(["Mr. Private"]);
  });
});

describe("clearing optional fields", () => {
  it("removes a project's cover when it is set to null", async () => {
    const area = await seedArea();
    const cover = await seedMedia();
    const project = await prisma.project.create({
      data: {
        slug: "p", titleEn: "P", titleBn: "প", locationEn: "", locationBn: "",
        descriptionEn: "d", descriptionBn: "d", workingAreaId: area.id, coverId: cover.id,
      },
    });
    const res = await request(server()).patch(`/api/projects/${project.id}`).set("Cookie", editor)
      .send({ coverId: null, year: null }).expect(200);
    expect(res.body.coverId).toBeNull();
  });

  it("accepts a project with no location yet, as the villa designs have", async () => {
    const area = await seedArea();
    await request(server()).post("/api/projects").set("Cookie", editor)
      .send({
        titleEn: "Villa", titleBn: "ভিলা", locationEn: "", locationBn: "",
        descriptionEn: "<p>d</p>", descriptionBn: "<p>d</p>", workingAreaId: area.id,
      })
      .expect(201);
  });

  it("saves an imported project that has no description yet, with the whole form the panel sends", async () => {
    // seed-projects.ts stores "" descriptions on purpose; renaming or
    // publishing one must not demand invented copy.
    const area = await seedArea();
    const project = await prisma.project.create({
      data: {
        slug: "factory-works", titleEn: "Factory Works", titleBn: "ফ্যাক্টরির কাজ", locationEn: "", locationBn: "",
        descriptionEn: "", descriptionBn: "", workingAreaId: area.id,
      },
    });
    await request(server()).patch(`/api/projects/${project.id}`).set("Cookie", editor)
      .send({
        titleEn: "Factory fit-out, Gazipur", titleBn: "ফ্যাক্টরি ফিট-আউট, গাজীপুর", locationEn: "", locationBn: "",
        descriptionEn: "", descriptionBn: "", clientName: null, areaSqft: null, year: null,
        workingAreaId: area.id, coverId: null, galleryIds: [], featured: false, published: true, sortOrder: 0,
      })
      .expect(200);
  });

  it("saves settings with no WhatsApp on the first line, as seeded", async () => {
    await request(server()).patch("/api/settings").set("Cookie", admin)
      .send({ phone: "01760775454", whatsapp: "", phoneSecondary: "01818843999", whatsappSecondary: null })
      .expect(200);
  });

  it("clears a social link in settings with an empty string", async () => {
    await request(server()).patch("/api/settings").set("Cookie", admin)
      .send({ facebookUrl: "https://facebook.com/homeinn" }).expect(200);
    const res = await request(server()).patch("/api/settings").set("Cookie", admin)
      .send({ facebookUrl: "" }).expect(200);
    expect(res.body.facebookUrl).toBeNull();
  });
});

describe("the admin read surface", () => {
  it("is closed without a session", async () => {
    await request(server()).get("/api/admin/projects").expect(401);
    await request(server()).get("/api/admin/summary").expect(401);
  });

  it("lists drafts alongside published rows, with images ready to show", async () => {
    const area = await seedArea();
    const cover = await seedMedia();
    await prisma.project.create({
      data: {
        slug: "draft", titleEn: "Draft", titleBn: "খসড়া", locationEn: "", locationBn: "",
        descriptionEn: "d", descriptionBn: "d", workingAreaId: area.id, coverId: cover.id, published: false,
      },
    });
    const res = await request(server()).get("/api/admin/projects").set("Cookie", editor).expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ slug: "draft", published: false });
    expect(res.body[0].cover.sources).toHaveLength(2);
  });

  it("opens one row by id with its gallery and relations", async () => {
    const area = await seedArea();
    const image = await seedMedia();
    const project = await prisma.project.create({
      data: {
        slug: "p", titleEn: "P", titleBn: "প", locationEn: "", locationBn: "",
        descriptionEn: "d", descriptionBn: "d", workingAreaId: area.id,
        gallery: { connect: [{ id: image.id }] },
      },
    });
    const res = await request(server()).get(`/api/admin/projects/${project.id}`).set("Cookie", editor).expect(200);
    expect(res.body.gallery).toHaveLength(1);
    expect(res.body.gallery[0].sources).toBeDefined();
    expect(res.body.workingArea.slug).toBe("residential");
  });

  it("answers 404 for an unknown resource or id", async () => {
    await request(server()).get("/api/admin/spaceships").set("Cookie", editor).expect(404);
    await request(server()).get("/api/admin/projects/ckxxxxxxxxxxxxxxxxxxxxxxx").set("Cookie", editor).expect(404);
  });

  it("serves every resource the panel edits", async () => {
    for (const resource of [
      "services", "projects", "working-areas", "hero", "blog", "testimonials", "team",
      "certifications", "products", "client-logos", "corporate-clients", "residential-clients",
    ]) {
      await request(server()).get(`/api/admin/${resource}`).set("Cookie", editor).expect(200);
    }
  });

  it("summarises what is waiting: new enquiries, and drafts per area", async () => {
    await prisma.lead.createMany({
      data: [
        { type: "CONTACT", name: "A", phone: "01760775454", locale: "en" },
        { type: "QUOTE", name: "B", phone: "01760775454", locale: "bn" },
        { type: "CONTACT", name: "C", phone: "01760775454", locale: "en", status: "WON" },
      ],
    });
    await request(server()).post("/api/products").set("Cookie", editor).send(product).expect(201);

    const res = await request(server()).get("/api/admin/summary").set("Cookie", editor).expect(200);

    expect(res.body.leads).toMatchObject({ NEW: 2, WON: 1, total: 3 });
    expect(res.body.recentLeads).toHaveLength(3);
    expect(res.body.content.products).toEqual({ total: 1, drafts: 1 });
  });
});
