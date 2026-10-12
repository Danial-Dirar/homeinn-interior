/**
 * Sets an admin account's password from the shell.
 *
 *   ADMIN_NEW_PASSWORD='a long passphrase' pnpm admin:password admin@homeinnbd.com
 *   ADMIN_NEW_PASSWORD='…' pnpm admin:password owner@example.com --create "Owner Name"
 *
 * The seed's admin upsert is `update: {}`, so setting SEED_ADMIN_PASSWORD after
 * the account exists changes nothing. This is the deliberate way to change it,
 * for example to replace the default password that is public on GitHub. Every
 * session the account had is ended.
 *
 * The password comes from the environment, not an argument, so it does not
 * sit in the process list; clear it from your shell history afterwards.
 */
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

export interface SetPasswordOptions {
  email: string;
  password: string;
  create?: boolean;
  name?: string;
}

export async function setAdminPassword(prisma: PrismaClient, options: SetPasswordOptions): Promise<void> {
  const email = options.email.trim().toLowerCase();
  if (options.password.length < 10) {
    throw new Error("The password must be at least 10 characters");
  }
  const passwordHash = await argon2.hash(options.password, { type: argon2.argon2id });
  const existing = await prisma.adminUser.findUnique({ where: { email } });

  if (!existing) {
    if (!options.create) throw new Error(`No account for ${email}; pass --create "Name" to make one`);
    await prisma.adminUser.create({
      data: { email, name: options.name?.trim() || email, role: "ADMIN", passwordHash },
    });
    return;
  }

  await prisma.adminUser.update({
    where: { id: existing.id },
    data: { passwordHash, sessionsValidAfter: new Date() },
  });
  await prisma.refreshToken.updateMany({
    where: { userId: existing.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

async function main(): Promise<void> {
  const [email, flag, name] = process.argv.slice(2);
  const password = process.env.ADMIN_NEW_PASSWORD;
  if (!email || !password) {
    console.error("Usage: ADMIN_NEW_PASSWORD='…' pnpm admin:password <email> [--create \"Name\"]");
    process.exit(1);
  }
  const prisma = new PrismaClient();
  try {
    await setAdminPassword(prisma, { email, password, create: flag === "--create", name });
    console.log(`Password set for ${email.toLowerCase()}. Its other sessions have been signed out.`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
