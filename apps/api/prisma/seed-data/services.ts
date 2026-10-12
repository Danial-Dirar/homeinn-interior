/**
 * The company profile's services (spec §2). Seven rows: the profile's seven with
 * its 2D and 3D entries merged (see the note below), plus Architectural Design,
 * added 2026-10-12. Titles are the profile's own wording except those two;
 * Bangla is a translation.
 *
 * The summaries and bodies restate the service name and nothing more — the profile
 * PDF's descriptive copy is not in this repository, so no capability, timeline, or
 * guarantee is claimed here that the company has not stated itself (spec §12).
 * Replace `summary*` / `body*` with the profile's own paragraphs when the source
 * document is available.
 */
export const services = [
  // Added 2026-10-12 at Muhammad's instruction: Home Inn now "does everything
  // starting from architecture design". Not from the 2026 profile. The copy
  // claims only what the company's own drawings and renders show.
  {
    slug: "architectural-design",
    titleEn: "Architectural Design",
    titleBn: "স্থাপত্য নকশা",
    summaryEn: "Buildings designed from the plot up: measured floor plans and 3D views before anything is built.",
    summaryBn: "জমি থেকে শুরু করে ভবনের নকশা: নির্মাণের আগেই মাপসহ ফ্লোর প্ল্যান ও ৩ডি ভিউ।",
    bodyEn: "<p>Home Inn designs buildings as well as the spaces inside them. A design is worked out in measured floor plans, then modelled and rendered in 3D, so the house can be seen and changed before construction starts.</p>",
    bodyBn: "<p>হোম ইন ভবনের ভেতরের জায়গার পাশাপাশি ভবনেরও নকশা করে। মাপসহ ফ্লোর প্ল্যানে নকশা তৈরি হয়, তারপর ৩ডি-তে মডেল ও রেন্ডার করা হয়, যাতে নির্মাণ শুরুর আগেই বাড়িটি দেখা ও বদলানো যায়।</p>",
    icon: "drafting-compass",
    sortOrder: 0,
    published: true,
  },
  {
    slug: "home-furniture-office-furniture-supply-customized-design",
    titleEn: "Home Furniture & Office Furniture Supply (Customized Design)",
    titleBn: "হোম ও অফিস ফার্নিচার সরবরাহ (কাস্টমাইজড ডিজাইন)",
    summaryEn: "Customised furniture for homes and offices, designed and supplied to order.",
    summaryBn: "বাসা ও অফিসের জন্য কাস্টমাইজড ফার্নিচার, চাহিদা অনুযায়ী ডিজাইন ও সরবরাহ।",
    bodyEn: "<p>Home Inn supplies home and office furniture to customised designs.</p>",
    bodyBn: "<p>হোম ইন কাস্টমাইজড ডিজাইনে বাসা ও অফিসের ফার্নিচার সরবরাহ করে।</p>",
    icon: "sofa",
    sortOrder: 1,
    published: true,
  },
  {
    slug: "interior-design-implementation",
    titleEn: "Interior Design & Implementation",
    titleBn: "ইন্টেরিয়র ডিজাইন ও বাস্তবায়ন",
    summaryEn: "Interior design carried through from drawing to finished space.",
    summaryBn: "ড্রয়িং থেকে সম্পূর্ণ কাজ পর্যন্ত ইন্টেরিয়র ডিজাইন ও বাস্তবায়ন।",
    bodyEn: "<p>Home Inn designs interiors and implements them on site.</p>",
    bodyBn: "<p>হোম ইন ইন্টেরিয়র ডিজাইন করে এবং সাইটে তা বাস্তবায়ন করে।</p>",
    icon: "paintbrush",
    sortOrder: 2,
    published: true,
  },
  {
    slug: "exterior-design-implementation",
    titleEn: "Exterior Design & Implementation",
    titleBn: "এক্সটেরিয়র ডিজাইন ও বাস্তবায়ন",
    summaryEn: "Exterior design carried through from drawing to finished facade.",
    summaryBn: "ড্রয়িং থেকে সম্পূর্ণ কাজ পর্যন্ত এক্সটেরিয়র ডিজাইন ও বাস্তবায়ন।",
    bodyEn: "<p>Home Inn designs exteriors and implements them on site.</p>",
    bodyBn: "<p>হোম ইন এক্সটেরিয়র ডিজাইন করে এবং সাইটে তা বাস্তবায়ন করে।</p>",
    icon: "building",
    sortOrder: 3,
    published: true,
  },
  // The profile lists "2D Plan & Solution" and "3D Model & Visualization" as
  // two separate products. Merged here at Muhammad's request — one drawing
  // service, two outputs — so the wording is ours rather than the profile's.
  // Splitting them again means restoring both entries and the sortOrder below.
  {
    slug: "2d-3d-plan-model-visualization",
    titleEn: "2D & 3D Plan, Model & Visualization",
    titleBn: "২ডি ও ৩ডি প্ল্যান, মডেল ও ভিজ্যুয়ালাইজেশন",
    summaryEn: "Two-dimensional layout plans and three-dimensional models of the proposed space.",
    summaryBn: "প্রস্তাবিত স্পেসের দ্বিমাত্রিক লেআউট প্ল্যান ও ত্রিমাত্রিক মডেল।",
    bodyEn: "<p>Home Inn prepares 2D plans and layout solutions, and produces 3D models and visualisations of the proposed space.</p>",
    bodyBn: "<p>হোম ইন ২ডি প্ল্যান ও লেআউট সমাধান তৈরি করে, এবং প্রস্তাবিত স্পেসের ৩ডি মডেল ও ভিজ্যুয়ালাইজেশন করে।</p>",
    icon: "ruler",
    sortOrder: 4,
    published: true,
  },
  {
    slug: "all-thai-work-implementation",
    titleEn: "All Thai Work Implementation",
    titleBn: "সকল থাই ওয়ার্ক বাস্তবায়ন",
    summaryEn: "Thai aluminium work, implemented on site.",
    summaryBn: "থাই অ্যালুমিনিয়ামের সকল কাজ, সাইটে বাস্তবায়ন।",
    bodyEn: "<p>Home Inn implements all Thai work.</p>",
    bodyBn: "<p>হোম ইন সকল থাই ওয়ার্ক বাস্তবায়ন করে।</p>",
    icon: "blinds",
    sortOrder: 5,
    published: true,
  },
  {
    slug: "home-appliance-kitchen-accessories-bathroom-accessories-all-items",
    titleEn: "Home Appliance (Kitchen Accessories, Bathroom Accessories & All Items)",
    titleBn: "হোম অ্যাপ্লায়েন্স (কিচেন আনুষাঙ্গিক, বাথরুম আনুষাঙ্গিক ও সকল সামগ্রী)",
    summaryEn: "Kitchen and bathroom accessories and other home appliance items.",
    summaryBn: "কিচেন ও বাথরুমের আনুষাঙ্গিক এবং অন্যান্য হোম অ্যাপ্লায়েন্স সামগ্রী।",
    bodyEn: "<p>Home Inn supplies kitchen accessories, bathroom accessories, and other home appliance items.</p>",
    bodyBn: "<p>হোম ইন কিচেন আনুষাঙ্গিক, বাথরুম আনুষাঙ্গিক ও অন্যান্য হোম অ্যাপ্লায়েন্স সামগ্রী সরবরাহ করে।</p>",
    icon: "cooking-pot",
    sortOrder: 6,
    published: true,
  },
];
