import { describe, expect, it } from "vitest";
import en from "./en.json";
import bn from "./bn.json";

type Tree = { [k: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out[path] = value;
    else Object.assign(out, flatten(value, path));
  }
  return out;
}

const flatEn = flatten(en as Tree);
const flatBn = flatten(bn as Tree);

describe("message catalogues", () => {
  it("declare exactly the same keys", () => {
    expect(Object.keys(flatBn).sort()).toEqual(Object.keys(flatEn).sort());
  });

  it("never leave a Bangla string empty when the English one is written", () => {
    // Spec §9: a bn page silently falling back to English is the failure mode
    // this whole locale design exists to prevent. Blocked copy is empty in
    // BOTH catalogues (spec §12) and the section hides — that is allowed.
    const halfTranslated = Object.keys(flatEn).filter(
      (key) => flatEn[key]?.trim() !== "" && flatBn[key]?.trim() === "",
    );
    expect(halfTranslated).toEqual([]);
  });

  it("states no count that can go stale in titles that list things", () => {
    // "Nine kinds" went stale the day a tenth working area was added, and
    // "Six ways" the day a seventh service was. These lines describe the list
    // without counting it.
    const keys = ["home.areasTitle", "home.servicesTitle", "services.intro"];
    const english = /\d|\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/i;
    const bangla = /[০-৯]|(?:^|\s)(এক|দুই|তিন|চার|পাঁচ|ছয়|সাত|আট|নয়|দশ|এগারো|বারো)(?:টি)?(?=\s|$|[,।—])/;
    const counted = keys.filter((key) => english.test(flatEn[key] ?? "") || bangla.test(flatBn[key] ?? ""));
    expect(counted).toEqual([]);
  });

  it("introduces the company as architecture as well as interiors", () => {
    expect(flatEn["home.statementTitle"]).toMatch(/^Architecture/);
    expect(flatBn["home.statementTitle"]).toMatch(/^স্থাপত্য/);
    expect(flatEn["seo.defaultTitle"]).toMatch(/Architecture/);
  });

  it("never says the model was built from the plan beside it", () => {
    // The plan and the model are two different houses. Each caption says what
    // its picture is; none of them joins the three into one project.
    expect(flatEn["home.processModelBody"]).not.toMatch(/\bplan\b/i);
    expect(flatBn["home.processModelBody"]).not.toMatch(/প্ল্যান/);
  });

  it("never use the retired brand name", () => {
    // The company is "Home Inn" now; "Interior Solution" went with the move
    // into architecture, in both languages.
    const stale = [...Object.entries(flatEn), ...Object.entries(flatBn)]
      .filter(([, value]) => /Interior Solution|ইন্টেরিয়র সলিউশন/.test(value))
      .map(([key]) => key);
    expect(stale).toEqual([]);
  });

  it("never leave English text sitting in the Bangla catalogue", () => {
    const untranslated = Object.entries(flatBn)
      .filter(([key, value]) => value.trim() !== "" && value === flatEn[key])
      // Proper nouns are identical in both catalogues by design.
      .filter(([key]) => !key.startsWith("common.brand") && !key.startsWith("common.social"))
      .filter(([key]) => key !== "nav.english" && key !== "nav.bangla")
      .map(([key]) => key);
    expect(untranslated).toEqual([]);
  });
});
