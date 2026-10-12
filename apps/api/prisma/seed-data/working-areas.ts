/**
 * The nine working areas, verbatim from the company profile (spec §2).
 * English is the source wording; Bangla is a translation, not a transliteration.
 * Slugs are the `slugify()` output of the English name, written out so the seed
 * stays stable if the slug rules ever change.
 */
export const workingAreas = [
  // Added 2026-10-12: projects at the design stage, shown in 3D renders. Kept
  // apart from built work so a render is never filed beside a photograph of
  // a finished job.
  {
    slug: "architectural-design",
    nameEn: "Architectural Design",
    nameBn: "স্থাপত্য নকশা",
    sortOrder: 0,
  },
  {
    slug: "corporate-office-bank-furniture",
    nameEn: "Corporate Office & Bank Furniture",
    nameBn: "কর্পোরেট অফিস ও ব্যাংক ফার্নিচার",
    sortOrder: 1,
  },
  {
    slug: "home-furniture-interior-exterior",
    nameEn: "Home Furniture, Interior & Exterior",
    nameBn: "হোম ফার্নিচার, ইন্টেরিয়র ও এক্সটেরিয়র",
    sortOrder: 2,
  },
  {
    slug: "resort-eco-resort-five-star-hotel",
    nameEn: "Resort, Eco-Resort & Five Star Hotel",
    nameBn: "রিসোর্ট, ইকো-রিসোর্ট ও ফাইভ স্টার হোটেল",
    sortOrder: 3,
  },
  {
    slug: "duplex-triplex-construction",
    nameEn: "Duplex & Triplex Construction",
    nameBn: "ডুপ্লেক্স ও ট্রিপ্লেক্স নির্মাণ",
    sortOrder: 4,
  },
  {
    slug: "showroom-outlet",
    nameEn: "Showroom Outlet",
    nameBn: "শোরুম আউটলেট",
    sortOrder: 5,
  },
  {
    slug: "industrial-building-steel-structure",
    nameEn: "Industrial Building Steel Structure",
    nameBn: "ইন্ডাস্ট্রিয়াল বিল্ডিং স্টিল স্ট্রাকচার",
    sortOrder: 6,
  },
  {
    slug: "landscaping",
    nameEn: "Landscaping",
    nameBn: "ল্যান্ডস্কেপিং",
    sortOrder: 7,
  },
  {
    slug: "gypsum-work",
    nameEn: "Gypsum Work",
    nameBn: "জিপসাম ওয়ার্ক",
    sortOrder: 8,
  },
  {
    slug: "govt-project-work",
    nameEn: "Govt. Project Work",
    nameBn: "সরকারি প্রকল্পের কাজ",
    sortOrder: 9,
  },
  // Added 2026-08-09 at Muhammad's request, and unlike the nine above it is not
  // from the company profile's own list. It covers the in-house workshop —
  // furniture and steel fabrication before it reaches a site — which is
  // genuinely a different thing from `industrial-building-steel-structure`
  // (that one is a building the company erects; this one is what it makes).
  {
    slug: "factory-works",
    nameEn: "Factory Works",
    nameBn: "ফ্যাক্টরির কাজ",
    sortOrder: 10,
  },
];
