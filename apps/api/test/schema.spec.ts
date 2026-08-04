import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

describe("schema", () => {
  afterAll(async () => { await prisma.$disconnect(); });

  it("stores and reads a bilingual working area", async () => {
    const created = await prisma.workingArea.create({
      data: { slug: "gypsum-work", nameEn: "Gypsum Work", nameBn: "জিপসাম ওয়ার্ক", sortOrder: 8 },
    });
    expect(created.nameBn).toBe("জিপসাম ওয়ার্ক");
    await prisma.workingArea.delete({ where: { id: created.id } });
  });

  it("defaults ResidentialClient.publiclyListed to false", async () => {
    const created = await prisma.residentialClient.create({
      data: { serial: 999, clientName: "Test Person", address: "Nowhere" },
    });
    expect(created.publiclyListed).toBe(false);
    await prisma.residentialClient.delete({ where: { id: created.id } });
  });

  it("enforces slug uniqueness on Service", async () => {
    const base = {
      titleEn: "T", titleBn: "ট", summaryEn: "S", summaryBn: "স",
      bodyEn: "B", bodyBn: "ব", icon: "sofa",
    };
    const a = await prisma.service.create({ data: { slug: "dupe-test", ...base } });
    await expect(
      prisma.service.create({ data: { slug: "dupe-test", ...base } }),
    ).rejects.toThrow();
    await prisma.service.delete({ where: { id: a.id } });
  });
});
