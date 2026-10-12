import { INestApplication } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { makeApp, resetDb } from "./setup-db";

const prisma = new PrismaClient();
let app: INestApplication;

/**
 * Its own app, so the throttler's in-memory counter starts at zero and no other
 * file's logins have spent part of the budget.
 */
beforeAll(async () => {
  process.env.LOGIN_THROTTLE_LIMIT = "10";
  app = await makeApp();
  await resetDb(prisma);
});
afterAll(async () => {
  delete process.env.LOGIN_THROTTLE_LIMIT;
  await app.close();
  await prisma.$disconnect();
});

describe("login throttle", () => {
  it("refuses the eleventh attempt from one address inside the window", async () => {
    // Blocking finding of the 2026-09-14 spec: without this, passwords can be
    // guessed as fast as the network allows.
    for (let i = 0; i < 10; i++) {
      await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: "nobody@homeinn.test", password: "wrongpassword" })
        .expect(401);
    }
    await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: "nobody@homeinn.test", password: "wrongpassword" })
      .expect(429);
  });
});
