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

describe("auth", () => {
  it("logs in and sets both cookies", async () => {
    const res = await request(server())
      .post("/api/auth/login")
      .send({ email: "admin@homeinn.test", password: "hunter22ok" })
      .expect(200);

    expect(res.body.user.email).toBe("admin@homeinn.test");
    expect(res.body.user).not.toHaveProperty("passwordHash");

    const cookies = res.headers["set-cookie"] as unknown as string[];
    expect(cookies.some((c) => c.startsWith("hi_access=") && c.includes("HttpOnly"))).toBe(true);
    expect(cookies.some((c) => c.startsWith("hi_refresh=") && c.includes("HttpOnly"))).toBe(true);
  });

  it("rejects a bad password with 401", async () => {
    await request(server())
      .post("/api/auth/login")
      .send({ email: "admin@homeinn.test", password: "wrongpassword" })
      .expect(401);
  });

  it("rejects a malformed body with 400", async () => {
    await request(server())
      .post("/api/auth/login")
      .send({ email: "not-an-email", password: "x" })
      .expect(400);
  });

  it("returns the current user from /me with the access cookie", async () => {
    const login = await request(server())
      .post("/api/auth/login")
      .send({ email: "admin@homeinn.test", password: "hunter22ok" });
    const cookies = login.headers["set-cookie"] as unknown as string[];

    const me = await request(server()).get("/api/auth/me").set("Cookie", cookies).expect(200);
    expect(me.body.user.role).toBe("ADMIN");
  });

  it("rejects /me without a cookie", async () => {
    await request(server()).get("/api/auth/me").expect(401);
  });

  it("rotates the refresh cookie", async () => {
    const login = await request(server())
      .post("/api/auth/login")
      .send({ email: "admin@homeinn.test", password: "hunter22ok" });
    const cookies = login.headers["set-cookie"] as unknown as string[];
    const before = cookies.find((c) => c.startsWith("hi_refresh="))!;

    const refreshed = await request(server())
      .post("/api/auth/refresh").set("Cookie", cookies).expect(200);
    const after = (refreshed.headers["set-cookie"] as unknown as string[])
      .find((c) => c.startsWith("hi_refresh="))!;

    expect(after).not.toBe(before);
  });

  it("rejects a replayed refresh token with 401", async () => {
    const login = await request(server())
      .post("/api/auth/login")
      .send({ email: "admin@homeinn.test", password: "hunter22ok" });
    const cookies = login.headers["set-cookie"] as unknown as string[];

    await request(server()).post("/api/auth/refresh").set("Cookie", cookies).expect(200);
    await request(server()).post("/api/auth/refresh").set("Cookie", cookies).expect(401);
  });
});
