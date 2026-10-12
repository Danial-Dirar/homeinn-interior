import { join } from "node:path";
import type { HeroManifestEntry } from "../../../src/content/hero-sync";

export const HERO_DIR = __dirname;

const UNSPLASH = "Unsplash License — free for commercial use, no attribution required";

/**
 * The home-page hero, in walking order: arrive at a house at dusk, sit in the
 * drawing room, pass the lounge, kitchen and bedroom, and end at an office —
 * the range of work Home Inn takes on, architecture to interiors.
 *
 * **These are stand-ins.** Free-licence photographs from Unsplash, chosen to
 * look like homes and offices in Bangladesh: ceiling fans, marble floors,
 * arched doorways, jali screens, window grills, a duplex with a boundary wall.
 * The first set (2026-10-12, morning) read as American houses and was
 * replaced the same day. Four of the six were taken in India; the other two
 * give no location.
 *
 * Spec §15 allows hero placeholders on two conditions: the licence is
 * recorded per file (below, and in ASSET-CHECKLIST.md), and the labels name a
 * kind of space, never a project. None of these is Home Inn's own work.
 * Replace them with the company's photographs or renders when good ones
 * exist — drop the file here, edit this list, and run
 * `pnpm --filter @homeinn/api seed:hero`.
 *
 * `focalX` keeps the subject in frame on a portrait phone crop.
 */
export const heroManifest: HeroManifestEntry[] = [
  {
    file: "architecture.jpg",
    labelEn: "Architecture",
    labelBn: "স্থাপত্য",
    altEn: "A modern two-storey house at dusk, with a patterned screen by the door and planting along the boundary wall",
    altBn: "সন্ধ্যায় দোতলা আধুনিক বাড়ি, দরজার পাশে নকশাদার স্ক্রিন ও সীমানা দেয়ালে গাছপালা",
    focalX: 0.5,
    showOnMobile: true,
    source: { url: "https://unsplash.com/photos/hmlP-v0vJ5o", author: "Elite Prop (@elite_prop19)", licence: UNSPLASH },
  },
  {
    file: "drawing-room.jpg",
    labelEn: "Drawing Room",
    labelBn: "ড্রয়িং রুম",
    altEn: "A drawing room with arched doorways, wooden armchairs, a ceiling fan and a marble floor",
    altBn: "খিলান-দরজা, কাঠের চেয়ার, সিলিং ফ্যান ও মার্বেল মেঝের একটি ড্রয়িং রুম",
    focalX: 0.45,
    showOnMobile: true,
    source: { url: "https://unsplash.com/photos/c14mTWtAKAQ", author: "Sanju Pandita (@spxclicks)", licence: UNSPLASH },
  },
  {
    file: "lounge.jpg",
    labelEn: "Lounge",
    labelBn: "লাউঞ্জ",
    altEn: "Two armchairs and a round wooden table before a patterned screen wall, with plants hanging above",
    altBn: "নকশাদার জালি দেয়ালের সামনে দুটি আর্মচেয়ার ও গোল কাঠের টেবিল, ওপরে ঝুলন্ত গাছ",
    focalX: 0.5,
    showOnMobile: false,
    source: { url: "https://unsplash.com/photos/p2oz7Bkk5t4", author: "Jejo Jose (@tomjejojose)", licence: UNSPLASH },
  },
  {
    file: "kitchen.jpg",
    labelEn: "Kitchen",
    labelBn: "রান্নাঘর",
    altEn: "A U-shaped kitchen with grey cabinets, built-in ovens and a ceiling fan",
    altBn: "ধূসর ক্যাবিনেট, বিল্ট-ইন ওভেন ও সিলিং ফ্যানসহ ইউ-আকৃতির রান্নাঘর",
    focalX: 0.55,
    showOnMobile: false,
    source: { url: "https://unsplash.com/photos/OVQqxYg3Az8", author: "SD Inc (@sdincseo)", licence: UNSPLASH },
  },
  {
    file: "bedroom.jpg",
    labelEn: "Bedroom",
    labelBn: "শোবার ঘর",
    altEn: "A bedroom with a panelled olive wall, a timber headboard and a wide window",
    altBn: "জলপাই রঙের প্যানেল দেয়াল, কাঠের হেডবোর্ড ও চওড়া জানালাসহ একটি শোবার ঘর",
    focalX: 0.6,
    showOnMobile: false,
    source: { url: "https://unsplash.com/photos/mfFyocD9ttI", author: "Anisha Deb (@newleafdesigns)", licence: UNSPLASH },
  },
  {
    file: "office.jpg",
    labelEn: "Office",
    labelBn: "অফিস",
    altEn: "An office with rows of workstations, glass partitions and a planter by the window",
    altBn: "সারি সারি ওয়ার্কস্টেশন, কাচের পার্টিশন ও জানালার পাশে গাছের টবসহ একটি অফিস",
    focalX: 0.4,
    showOnMobile: true,
    source: { url: "https://unsplash.com/photos/eSKkEgvhq_I", author: "PYX Photography (@pyx_photo)", licence: UNSPLASH },
  },
];

export const heroFile = (file: string): string => join(HERO_DIR, file);
