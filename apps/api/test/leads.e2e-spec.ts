import { INestApplication } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import * as argon2 from "argon2";
import { makeApp, resetDb } from "./setup-db";

const prisma = new PrismaClient();
let app: INestApplication;

const submission = {
  type: "CONTACT",
  name: "Rahim Uddin",
  phone: "01760775454",
  message: "Please call me about a full flat interior.",
  locale: "bn",
};

beforeAll(async () => {
  app = await makeApp();
});
afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

beforeEach(async () => {
  await resetDb(prisma);
  await prisma.adminUser.create({
    data: {
      email: "admin@homeinn.test",
      name: "Admin",
      role: "ADMIN",
      passwordHash: await argon2.hash("hunter22ok", { type: argon2.argon2id }),
    },
  });
});

const server = () => app.getHttpServer();

async function login(): Promise<string[]> {
  const res = await request(server())
    .post("/api/auth/login")
    .send({ email: "admin@homeinn.test", password: "hunter22ok" })
    .expect(200);
  return res.headers["set-cookie"] as unknown as string[];
}

function seedLead(over: Partial<typeof submission> & { createdAt?: Date } = {}) {
  return prisma.lead.create({
    data: { type: "CONTACT", name: "Seed", phone: "01760775454", locale: "en", ...over } as never,
  });
}

// The public POST is the only unauthenticated write in the API. It is capped at
// 5/hour per IP, and the throttler counts across this whole file — so the
// submissions below stay inside that budget and the cap is asserted last.
describe("public lead submission", () => {
  it("accepts a submission without authentication", async () => {
    const res = await request(server()).post("/api/leads").send(submission).expect(201);

    expect(res.body.id).toEqual(expect.any(String));
    expect(res.body.status).toBe("NEW");
    expect(await prisma.lead.count()).toBe(1);
  });

  it("normalises a +880 phone number before storing it", async () => {
    await request(server())
      .post("/api/leads")
      .send({ ...submission, phone: "+880 1760-775454" })
      .expect(201);

    const row = await prisma.lead.findFirstOrThrow();
    expect(row.phone).toBe("01760775454");
  });

  it("never returns internal fields to the submitter", async () => {
    const res = await request(server()).post("/api/leads").send(submission).expect(201);

    expect(res.body).not.toHaveProperty("internalNotes");
  });

  it("rejects a submission that is not a Bangladeshi mobile number with 400", async () => {
    await request(server())
      .post("/api/leads")
      .send({ ...submission, phone: "12345" })
      .expect(400);

    expect(await prisma.lead.count()).toBe(0);
  });

  it("rate-limits repeated submissions from the same client", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await request(server()).post("/api/leads").send(submission);
      statuses.push(res.status);
    }

    expect(statuses).toContain(429);
  });
});

describe("lead administration", () => {
  it("rejects an unauthenticated list with 401", async () => {
    await request(server()).get("/api/leads").expect(401);
  });

  it("lists leads newest first for an authenticated admin", async () => {
    await seedLead({ name: "Older", createdAt: new Date("2026-01-01T00:00:00Z") });
    await seedLead({ name: "Newer", createdAt: new Date("2026-06-01T00:00:00Z") });

    const res = await request(server()).get("/api/leads").set("Cookie", await login()).expect(200);

    expect(res.body.total).toBe(2);
    expect(res.body.items.map((l: { name: string }) => l.name)).toEqual(["Newer", "Older"]);
  });

  it("paginates the list", async () => {
    await seedLead({ name: "A" });
    await seedLead({ name: "B" });

    const res = await request(server())
      .get("/api/leads?page=2&perPage=1")
      .set("Cookie", await login())
      .expect(200);

    expect(res.body.items).toHaveLength(1);
    expect(res.body.total).toBe(2);
  });

  it("rejects an unauthenticated update with 401", async () => {
    const lead = await seedLead();
    await request(server()).patch(`/api/leads/${lead.id}`).send({ status: "WON" }).expect(401);
  });

  it("updates the status and internal notes", async () => {
    const lead = await seedLead();

    const res = await request(server())
      .patch(`/api/leads/${lead.id}`)
      .set("Cookie", await login())
      .send({ status: "CONTACTED", internalNotes: "Called back on Tuesday." })
      .expect(200);

    expect(res.body.status).toBe("CONTACTED");
    const row = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(row.internalNotes).toBe("Called back on Tuesday.");
  });

  it("rejects an unknown status with 400", async () => {
    const lead = await seedLead();

    await request(server())
      .patch(`/api/leads/${lead.id}`)
      .set("Cookie", await login())
      .send({ status: "MAYBE" })
      .expect(400);
  });

  it("returns 404 when updating a lead that does not exist", async () => {
    await request(server())
      .patch("/api/leads/ckzzzzzzzzzzzzzzzzzzzzzzz")
      .set("Cookie", await login())
      .send({ status: "WON" })
      .expect(404);
  });
});
