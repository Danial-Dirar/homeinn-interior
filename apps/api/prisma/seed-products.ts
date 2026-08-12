import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { MediaService } from "../src/media/media.service";
import { LocalDiskStorage } from "../src/media/storage/local-disk.storage";

const DUMP = join(__dirname, "..", "..", "..", "media_dump");

/** ৳ to poisha, so nothing downstream ever multiplies a float. */
const taka = (amount: number): number => Math.round(amount * 100);

/**
 * Placeholder furniture, drawn from the company's own archive.
 *
 * **Every price here is invented and must be replaced before this page is
 * published.** They exist so the layout can be judged with realistic numbers;
 * spec §12 does not allow the site to quote a price the company has not set.
 * `seed-products.ts` is the only place they live — change them here, or set
 * `priceBdt: null` to show "price on request" instead.
 *
 * The photographs are real pieces Home Inn built, which is why they beat stock:
 * a furniture page selling someone else's cabinets would be the same lie the
 * rest of this site avoids.
 */
const PRODUCTS = [
  {
    slug: "carved-wooden-wardrobe",
    nameEn: "Carved Wooden Wardrobe",
    nameBn: "কারুকাজ করা কাঠের আলমারি",
    summaryEn: "Three-door wardrobe in solid wood with a hand-carved crown.",
    summaryBn: "নিরেট কাঠের তিন-দরজার আলমারি, হাতে খোদাই করা মুকুটসহ।",
    priceBdt: taka(78_000),
    leadTimeDays: 21,
    file: "IMG_20240523_230957.jpg",
  },
  {
    slug: "mirrored-dressing-unit",
    nameEn: "Mirrored Dressing Unit",
    nameBn: "আয়নাসহ ড্রেসিং ইউনিট",
    summaryEn: "Full-height mirror with a drawer chest and carved surround.",
    summaryBn: "পূর্ণ উচ্চতার আয়না, ড্রয়ার ও খোদাই করা ফ্রেমসহ।",
    priceBdt: taka(32_000),
    leadTimeDays: 14,
    file: "IMG_20240608_160758.jpg",
  },
  {
    slug: "office-workstation-desk",
    nameEn: "Office Workstation Desk",
    nameBn: "অফিস ওয়ার্কস্টেশন ডেস্ক",
    summaryEn: "Laminated worktop over a three-drawer pedestal and side cabinet.",
    summaryBn: "ল্যামিনেটেড টপ, তিন-ড্রয়ার পেডেস্টাল ও পাশের ক্যাবিনেটসহ।",
    priceBdt: taka(41_500),
    leadTimeDays: 18,
    file: "IMG_20240912_215742.jpg",
  },
  {
    slug: "executive-desk",
    nameEn: "Executive Desk",
    nameBn: "এক্সিকিউটিভ ডেস্ক",
    summaryEn: "Wide veneered top on a sculpted dark base.",
    summaryBn: "চওড়া ভিনিয়ার টপ, গাঢ় রঙের ভাস্কর্যধর্মী পায়ার উপর।",
    priceBdt: taka(96_000),
    leadTimeDays: 25,
    file: "IMG_20250504_154016.jpg",
  },
  {
    slug: "steel-display-shelving",
    nameEn: "Steel Display Shelving",
    nameBn: "স্টিলের ডিসপ্লে শেলভিং",
    summaryEn: "Powder-coated steel frame shelving for showrooms and outlets.",
    summaryBn: "শোরুম ও আউটলেটের জন্য পাউডার-কোটেড স্টিল ফ্রেমের র‍্যাক।",
    // Sized per bay, so a single figure would be a guess of the wrong kind.
    priceBdt: null,
    leadTimeDays: 20,
    file: "IMG_20241025_145236.jpg",
  },
  {
    slug: "bedroom-wardrobe-wall",
    nameEn: "Fitted Bedroom Wardrobe",
    nameBn: "বেডরুমের ফিটেড ওয়ারড্রোব",
    summaryEn: "Floor-to-ceiling fitted wardrobe with open display bays and lighting.",
    summaryBn: "মেঝে থেকে ছাদ পর্যন্ত ফিটেড ওয়ারড্রোব, খোলা তাক ও আলোসহ।",
    priceBdt: taka(135_000),
    leadTimeDays: 30,
    file: "IMG_20251226_135754.jpg",
  },
];

export async function seedProducts(prisma: PrismaClient): Promise<void> {
  const media = new MediaService(prisma as never, new LocalDiskStorage());

  // Every piece here is furniture, so it belongs under the furniture service.
  const service = await prisma.service.findFirst({
    where: { slug: { startsWith: "home-furniture-office-furniture-supply" } },
  });

  for (const [index, product] of PRODUCTS.entries()) {
    if (await prisma.shopProduct.findUnique({ where: { slug: product.slug } })) continue;

    const cover = await media.ingest(
      {
        buffer: await readFile(join(DUMP, product.file)),
        mimetype: "image/jpeg",
        originalname: product.file,
      },
      { altEn: product.summaryEn, altBn: product.summaryBn },
    );

    await prisma.shopProduct.create({
      data: {
        slug: product.slug,
        nameEn: product.nameEn,
        nameBn: product.nameBn,
        summaryEn: product.summaryEn,
        summaryBn: product.summaryBn,
        // No invented marketing copy: the detail page shows the summary until
        // someone writes the real thing.
        descriptionEn: "",
        descriptionBn: "",
        priceBdt: product.priceBdt,
        madeToOrder: true,
        leadTimeDays: product.leadTimeDays,
        serviceId: service?.id ?? null,
        coverId: cover.id,
        sortOrder: index,
        featured: index < 3,
        published: true,
      },
    });
    console.log(`${product.slug}`);
  }

  console.log(`\n${await prisma.shopProduct.count()} products.`);
  console.log("Prices are placeholders — replace them before this page goes live.");
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedProducts(prisma)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => void prisma.$disconnect());
}
