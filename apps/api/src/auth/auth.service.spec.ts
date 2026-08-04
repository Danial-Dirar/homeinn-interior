import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PasswordService } from "./password.service";
import { TokenService } from "./token.service";
import { AuthService } from "./auth.service";

type Row = { id: string; userId: string; tokenHash: string; expiresAt: Date; revokedAt: Date | null };

function fakePrisma() {
  const rows: Row[] = [];
  return {
    rows,
    refreshToken: {
      create: async ({ data }: { data: Omit<Row, "id"> }) => {
        const row = { id: `r${rows.length}`, ...data };
        rows.push(row);
        return row;
      },
      findUnique: async ({ where }: { where: { tokenHash: string } }) =>
        rows.find((r) => r.tokenHash === where.tokenHash) ?? null,
      update: async ({ where, data }: { where: { id: string }; data: Partial<Row> }) => {
        const row = rows.find((r) => r.id === where.id)!;
        Object.assign(row, data);
        return row;
      },
      updateMany: async ({ where, data }: { where: { userId: string }; data: Partial<Row> }) => {
        const hit = rows.filter((r) => r.userId === where.userId);
        hit.forEach((r) => Object.assign(r, data));
        return { count: hit.length };
      },
    },
  };
}

const jwt = new JwtService({ secret: "test-secret" });

describe("TokenService", () => {
  it("issues a refresh token and stores only its hash", async () => {
    const prisma = fakePrisma();
    const svc = new TokenService(jwt, prisma as never);
    const token = await svc.issueRefresh("user-1");
    expect(prisma.rows).toHaveLength(1);
    expect(prisma.rows[0]!.tokenHash).not.toBe(token);
  });

  it("rotates a valid refresh token and revokes the old one", async () => {
    const prisma = fakePrisma();
    const svc = new TokenService(jwt, prisma as never);
    const first = await svc.issueRefresh("user-1");
    const { userId, refresh } = await svc.rotate(first);
    expect(userId).toBe("user-1");
    expect(refresh).not.toBe(first);
    expect(prisma.rows[0]!.revokedAt).not.toBeNull();
  });

  it("rejects an unknown refresh token", async () => {
    const prisma = fakePrisma();
    const svc = new TokenService(jwt, prisma as never);
    await expect(svc.rotate("never-issued")).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("revokes the whole chain when a used token is replayed", async () => {
    const prisma = fakePrisma();
    const svc = new TokenService(jwt, prisma as never);
    const first = await svc.issueRefresh("user-1");
    await svc.rotate(first);
    await expect(svc.rotate(first)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.rows.every((r) => r.revokedAt !== null)).toBe(true);
  });

  it("rejects an expired refresh token", async () => {
    const prisma = fakePrisma();
    const svc = new TokenService(jwt, prisma as never);
    const token = await svc.issueRefresh("user-1");
    prisma.rows[0]!.expiresAt = new Date(Date.now() - 1000);
    await expect(svc.rotate(token)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe("AuthService.login", () => {
  const passwords = new PasswordService();

  it("returns tokens for correct credentials", async () => {
    const prisma = fakePrisma();
    const hash = await passwords.hash("hunter22");
    const users = {
      findByEmail: async () => ({ id: "u1", email: "a@b.com", name: "A", passwordHash: hash, role: "ADMIN" }),
    };
    const svc = new AuthService(users as never, passwords, new TokenService(jwt, prisma as never));
    const out = await svc.login({ email: "a@b.com", password: "hunter22" });
    expect(out.user).toEqual({ id: "u1", email: "a@b.com", name: "A", role: "ADMIN" });
    expect(out.access).toBeTruthy();
    expect(out.refresh).toBeTruthy();
  });

  it("rejects a wrong password", async () => {
    const prisma = fakePrisma();
    const hash = await passwords.hash("hunter22");
    const users = {
      findByEmail: async () => ({ id: "u1", email: "a@b.com", name: "A", passwordHash: hash, role: "ADMIN" }),
    };
    const svc = new AuthService(users as never, passwords, new TokenService(jwt, prisma as never));
    await expect(svc.login({ email: "a@b.com", password: "wrong-one" }))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects an unknown email with the same error as a wrong password", async () => {
    const prisma = fakePrisma();
    const users = { findByEmail: async () => null };
    const svc = new AuthService(users as never, passwords, new TokenService(jwt, prisma as never));
    await expect(svc.login({ email: "nobody@b.com", password: "hunter22" }))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });
});
