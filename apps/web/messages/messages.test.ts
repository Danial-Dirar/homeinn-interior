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
