import type { ArchitectureProject } from "../../src/content/architecture-manifest";

/**
 * Home Inn's own villa designs, from the company's renders (2026). Titles are
 * descriptive, at Muhammad's choice; location, year and client are left for
 * the admin. The images live in the gitignored `architecture_renders/<slug>/`
 * at the repo root — see handout.md for the copy step.
 */
export const architectureManifest: ArchitectureProject[] = [
  {
    slug: "brick-screen-villa",
    titleEn: "Brick-Screen Villa",
    titleBn: "ইটের জালির ভিলা",
    descriptionEn:
      "<p>A two-storey family house designed by Home Inn, shown here in 3D renders. A brick jali screen wraps the stair tower, shading it while letting light and air through; the living room opens onto the garden behind glass, and the roof becomes a terrace under a pergola.</p>",
    descriptionBn:
      "<p>হোম ইনের নকশা করা একটি দোতলা পারিবারিক বাড়ি, এখানে ৩ডি রেন্ডারে দেখানো হয়েছে। সিঁড়ির টাওয়ার ঘিরে ইটের জালি — ছায়া দেয়, আলো-বাতাস ঢুকতে দেয়; বসার ঘর কাচের ভেতর দিয়ে বাগানের দিকে খোলা, আর ছাদ পারগোলার নিচে টেরেস।</p>",
    sortOrder: 0,
    cover: { file: "front.jpg", altEn: "3D render: the front of a two-storey house, a brick jali screen over the stair tower beside a glazed living room and car porch", altBn: "৩ডি রেন্ডার: দোতলা বাড়ির সামনের দিক — সিঁড়ির টাওয়ারে ইটের জালি, পাশে কাচঘেরা বসার ঘর ও গাড়ি বারান্দা" },
    gallery: [
      { file: "gate.jpg", altEn: "3D render: the house seen through its gate and boundary wall", altBn: "৩ডি রেন্ডার: গেট ও সীমানা দেয়ালের ভেতর দিয়ে বাড়িটি" },
      { file: "street-corner.jpg", altEn: "3D render: the brick jali tower over the car porch, seen from the street corner", altBn: "৩ডি রেন্ডার: রাস্তার মোড় থেকে গাড়ি বারান্দার ওপরে ইটের জালির টাওয়ার" },
      { file: "aerial-roof-terrace.jpg", altEn: "3D render: an aerial view of the roof terrace, pergola and brick panels", altBn: "৩ডি রেন্ডার: ছাদের টেরেস, পারগোলা ও ইটের প্যানেলের ওপর থেকে দৃশ্য" },
      { file: "aerial-entrance.jpg", altEn: "3D render: an aerial view from the entrance side", altBn: "৩ডি রেন্ডার: প্রবেশপথের দিক থেকে ওপরের দৃশ্য" },
      { file: "stair-hall.jpg", altEn: "3D render: a floating stair against the brick jali wall, with an indoor tree", altBn: "৩ডি রেন্ডার: ইটের জালির দেয়ালের পাশে ঝুলন্ত সিঁড়ি, সঙ্গে ঘরের ভেতরের গাছ" },
      { file: "dining.jpg", altEn: "3D render: the dining table beside the stair, under a double-height window", altBn: "৩ডি রেন্ডার: সিঁড়ির পাশে খাবার টেবিল, ওপরে দুই তলা উঁচু জানালা" },
      { file: "living-room.jpg", altEn: "3D render: the living room, a timber TV wall facing a long sofa and a glazed corner", altBn: "৩ডি রেন্ডার: বসার ঘর — কাঠের টিভি দেয়ালের সামনে লম্বা সোফা ও কাচের কোণ" },
      { file: "bedroom.jpg", altEn: "3D render: a bedroom with a timber accent wall and a wide window", altBn: "৩ডি রেন্ডার: কাঠের অ্যাকসেন্ট দেয়াল ও চওড়া জানালাসহ শোবার ঘর" },
      { file: "cutaway-ground.jpg", altEn: "3D render: the ground floor cut away to show the rooms, car porch and garden", altBn: "৩ডি রেন্ডার: কেটে দেখানো নিচতলা — ঘর, গাড়ি বারান্দা ও বাগান" },
      { file: "cutaway-upper.jpg", altEn: "3D render: the upper floor cut away to show the bedrooms and terraces", altBn: "৩ডি রেন্ডার: কেটে দেখানো ওপরতলা — শোবার ঘর ও টেরেস" },
    ],
  },
  {
    slug: "rooftop-pool-villa",
    titleEn: "Rooftop-Pool Villa",
    titleBn: "ছাদে পুলসহ ভিলা",
    descriptionEn:
      "<p>A two-storey house designed by Home Inn, shown here in 3D renders: an arched portico and columns at the front, a jali-screened stair tower, and a swimming pool on the roof.</p>",
    descriptionBn:
      "<p>হোম ইনের নকশা করা একটি দোতলা বাড়ি, এখানে ৩ডি রেন্ডারে দেখানো হয়েছে: সামনে খিলানযুক্ত পোর্টিকো ও কলাম, জালিঘেরা সিঁড়ির টাওয়ার, আর ছাদে সুইমিং পুল।</p>",
    sortOrder: 1,
    cover: { file: "front.jpg", altEn: "3D render: the front of a two-storey house with an arched portico, columns and a car porch", altBn: "৩ডি রেন্ডার: খিলানযুক্ত পোর্টিকো, কলাম ও গাড়ি বারান্দাসহ দোতলা বাড়ির সামনের দিক" },
    gallery: [
      { file: "garden-approach.jpg", altEn: "3D render: the house from the garden path, the stair tower rising above the portico", altBn: "৩ডি রেন্ডার: বাগানের পথ থেকে বাড়িটি, পোর্টিকোর ওপরে সিঁড়ির টাওয়ার" },
      { file: "aerial-pool.jpg", altEn: "3D render: an aerial view of the rooftop pool beside the jali-screened stair tower", altBn: "৩ডি রেন্ডার: জালিঘেরা সিঁড়ির টাওয়ারের পাশে ছাদের পুল, ওপর থেকে দৃশ্য" },
      { file: "aerial-roof.jpg", altEn: "3D render: the roof from above — pool, deck and railings", altBn: "৩ডি রেন্ডার: ওপর থেকে ছাদ — পুল, ডেক ও রেলিং" },
      { file: "aerial-porch.jpg", altEn: "3D render: an aerial view over the car porch and the jali panel", altBn: "৩ডি রেন্ডার: গাড়ি বারান্দা ও জালি প্যানেলের ওপর থেকে দৃশ্য" },
      { file: "pool-deck.jpg", altEn: "3D render: the rooftop pool deck and pergola", altBn: "৩ডি রেন্ডার: ছাদের পুল ডেক ও পারগোলা" },
      { file: "living-room.jpg", altEn: "3D render: a living room with a timber TV wall, an arched window and green cushions", altBn: "৩ডি রেন্ডার: কাঠের টিভি দেয়াল, খিলান জানালা ও সবুজ কুশনসহ বসার ঘর" },
      { file: "dining-hall.jpg", altEn: "3D render: a double-height dining hall", altBn: "৩ডি রেন্ডার: দুই তলা উঁচু খাবার ঘর" },
      { file: "stair.jpg", altEn: "3D render: the stair, with a jali screen and indoor planting", altBn: "৩ডি রেন্ডার: জালির পর্দা ও ঘরের ভেতরের গাছসহ সিঁড়ি" },
      { file: "plan-view.jpg", altEn: "3D render: the ground floor seen from directly above", altBn: "৩ডি রেন্ডার: ঠিক ওপর থেকে দেখা নিচতলা" },
      { file: "cutaway-ground.jpg", altEn: "3D render: the ground floor cut away to show the rooms and garage", altBn: "৩ডি রেন্ডার: কেটে দেখানো নিচতলা — ঘর ও গ্যারেজ" },
    ],
  },
];
