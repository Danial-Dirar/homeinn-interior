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

async function login(email: string, password = "hunter22ok"): Promise<string[]> {
  const res = await request(server()).post("/api/auth/login").send({ email, password }).expect(200);
  return res.headers["set-cookie"] as unknown as string[];
}

describe("changing your own password", () => {
  it("needs a session", async () => {
    await request(server())
      .post("/api/auth/password")
      .send({ currentPassword: "hunter22ok", newPassword: "a-much-longer-one" })
      .expect(401);
  });

  it("refuses a wrong current password", async () => {
    const cookies = await login("editor@homeinn.test");
    await request(server())
      .post("/api/auth/password")
      .set("Cookie", cookies)
      .send({ currentPassword: "not-the-one", newPassword: "a-much-longer-one" })
      .expect(400);
  });

  it("refuses a new password shorter than ten characters", async () => {
    const cookies = await login("editor@homeinn.test");
    await request(server())
      .post("/api/auth/password")
      .set("Cookie", cookies)
      .send({ currentPassword: "hunter22ok", newPassword: "short" })
      .expect(400);
  });

  it("takes effect: the new password logs in and the old one no longer does", async () => {
    const cookies = await login("editor@homeinn.test");
    await request(server())
      .post("/api/auth/password")
      .set("Cookie", cookies)
      .send({ currentPassword: "hunter22ok", newPassword: "a-much-longer-one" })
      .expect(200);

    await login("editor@homeinn.test", "a-much-longer-one");
    await request(server())
      .post("/api/auth/login")
      .send({ email: "editor@homeinn.test", password: "hunter22ok" })
      .expect(401);
  });
});

describe("accounts", () => {
  it("are listed to an admin, never with a password hash", async () => {
    const cookies = await login("admin@homeinn.test");
    const res = await request(server()).get("/api/users").set("Cookie", cookies).expect(200);

    expect(res.body.map((u: { email: string }) => u.email).sort())
      .toEqual(["admin@homeinn.test", "editor@homeinn.test"]);
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
  });

  it("are not listed to an editor", async () => {
    const cookies = await login("editor@homeinn.test");
    await request(server()).get("/api/users").set("Cookie", cookies).expect(403);
  });

  it("can be added by an admin, and the new person can log in", async () => {
    const cookies = await login("admin@homeinn.test");
    const res = await request(server())
      .post("/api/users")
      .set("Cookie", cookies)
      .send({ email: "New@HomeInn.test", name: "New Person", role: "EDITOR", password: "first-password-1" })
      .expect(201);

    expect(res.body).toMatchObject({ email: "new@homeinn.test", role: "EDITOR" });
    expect(res.body).not.toHaveProperty("passwordHash");
    await login("new@homeinn.test", "first-password-1");
  });

  it("refuse a second account with the same email", async () => {
    const cookies = await login("admin@homeinn.test");
    await request(server())
      .post("/api/users")
      .set("Cookie", cookies)
      .send({ email: "editor@homeinn.test", name: "Twin", role: "EDITOR", password: "first-password-1" })
      .expect(409);
  });

  it("can have their role and password changed by an admin", async () => {
    const cookies = await login("admin@homeinn.test");
    const editor = await prisma.adminUser.findUniqueOrThrow({ where: { email: "editor@homeinn.test" } });
    await request(server())
      .patch(`/api/users/${editor.id}`)
      .set("Cookie", cookies)
      .send({ role: "ADMIN", password: "reset-by-admin-1" })
      .expect(200);

    const res = await request(server())
      .post("/api/auth/login")
      .send({ email: "editor@homeinn.test", password: "reset-by-admin-1" })
      .expect(200);
    expect(res.body.user.role).toBe("ADMIN");
  });

  it("can be removed by an admin", async () => {
    const cookies = await login("admin@homeinn.test");
    const editor = await prisma.adminUser.findUniqueOrThrow({ where: { email: "editor@homeinn.test" } });
    await request(server()).delete(`/api/users/${editor.id}`).set("Cookie", cookies).expect(204);
    expect(await prisma.adminUser.count()).toBe(1);
  });

  it("never lets an admin delete themselves", async () => {
    const cookies = await login("admin@homeinn.test");
    const admin = await prisma.adminUser.findUniqueOrThrow({ where: { email: "admin@homeinn.test" } });
    await request(server()).delete(`/api/users/${admin.id}`).set("Cookie", cookies).expect(400);
  });

  it("never demotes the last admin", async () => {
    // Otherwise nobody could manage accounts again without the database.
    const cookies = await login("admin@homeinn.test");
    const admin = await prisma.adminUser.findUniqueOrThrow({ where: { email: "admin@homeinn.test" } });
    await request(server())
      .patch(`/api/users/${admin.id}`)
      .set("Cookie", cookies)
      .send({ role: "EDITOR" })
      .expect(409);
  });
});
