import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";
import { corporateClients } from "./seed-data/corporate-clients";
import { residentialClients } from "./seed-data/residential-clients";
import { services } from "./seed-data/services";
import { workingAreas } from "./seed-data/working-areas";

/** Credentials listed in the company profile (spec §2). */
const certifications = [
  { titleEn: "Trade License", titleBn: "ট্রেড লাইসেন্স", issuer: "M/S Ahasan Enterprise", reference: null, sortOrder: 0 },
  { titleEn: "VAT Registration", titleBn: "ভ্যাট নিবন্ধন", issuer: "National Board of Revenue", reference: "BIN 001489494-0804", sortOrder: 1 },
  { titleEn: "TIN Certificate", titleBn: "টিআইএন সার্টিফিকেট", issuer: "National Board of Revenue", reference: null, sortOrder: 2 },
];

/**
 * Idempotent: every write is keyed on a natural identifier (slug, serial, title,
 * email) so re-running updates in place instead of duplicating. Safe to run on
 * every deploy.
 */
export async function seed(prisma: PrismaClient): Promise<void> {
  await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    // The second line is pushed on re-seed too; `update: {}` would leave an
    // already-seeded database without it forever.
    update: { phoneSecondary: "01818843999", whatsappSecondary: "+8801818843999" },
    create: {
      id: "singleton",
      phone: "01760775454",
      whatsapp: "+8801760775454",
      phoneSecondary: "01818843999",
      whatsappSecondary: "+8801818843999",
      email: "homeinnbd14@gmail.com",
      addressEn: "Plot# 18, Road# 03, Block# KHA, Section# 06, Mirpur-10, Dhaka-1216",
      addressBn: "প্লট# ১৮, রোড# ০৩, ব্লক# খ, সেকশন# ০৬, মিরপুর-১০, ঢাকা-১২১৬",
      hoursEn: "Open every day",
      hoursBn: "প্রতিদিন খোলা",
      facebookUrl: "https://www.facebook.com/homeinnbd14",
      instagramUrl: "https://www.instagram.com/homeinnbd",
      establishedYear: 2015,
      // The profile's stated track record. These counts are the source of truth
      // even while the row-level client tables are still being transcribed.
      corporateProjectCount: 73,
      residentialProjectCount: 57,
      districtCount: 13,
    },
  });

  for (const area of workingAreas) {
    await prisma.workingArea.upsert({ where: { slug: area.slug }, update: area, create: area });
  }
  for (const service of services) {
    await prisma.service.upsert({ where: { slug: service.slug }, update: service, create: service });
  }

  // Client tables are keyed by serial so re-runs update rather than duplicate.
  for (const row of corporateClients) {
    const existing = await prisma.corporateClient.findFirst({ where: { serial: row.serial } });
    existing
      ? await prisma.corporateClient.update({ where: { id: existing.id }, data: row })
      : await prisma.corporateClient.create({ data: row });
  }
  for (const row of residentialClients) {
    const existing = await prisma.residentialClient.findFirst({ where: { serial: row.serial } });
    existing
      ? await prisma.residentialClient.update({ where: { id: existing.id }, data: row })
      : await prisma.residentialClient.create({ data: row });
  }

  for (const cert of certifications) {
    const existing = await prisma.certification.findFirst({ where: { titleEn: cert.titleEn } });
    if (!existing) await prisma.certification.create({ data: cert });
  }

  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@homeinnbd.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMeNow!2026";
  await prisma.adminUser.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Home Inn Admin",
      role: "ADMIN",
      passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
    },
  });

  // Testimonials and team are intentionally empty — spec §12, no invented content.
}

/** `pnpm seed` runs this file directly; importers (tests) call `seed()` themselves. */
if (require.main === module) {
  const prisma = new PrismaClient();
  seed(prisma)
    .then(() => console.log("seed complete"))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => void prisma.$disconnect());
}
