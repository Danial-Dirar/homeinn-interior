import { describe, expect, it } from "vitest";
import type { SiteSettingsView } from "./api.types";
import {
  alternatesFor, articleJsonLd, breadcrumbJsonLd, canonicalFor, localBusinessJsonLd,
  metadataFromSeo,
} from "./seo";

const settings: SiteSettingsView = {
  id: "singleton", phone: "01760775454", whatsapp: "+8801760775454",
  phoneSecondary: "01818843999", whatsappSecondary: "+8801818843999",
  email: "homeinnbd14@gmail.com",
  addressEn: "Plot# 18, Road# 03, Block# KHA, Section# 06, Mirpur-10, Dhaka-1216",
  addressBn: "প্লট# ১৮, মিরপুর-১০, ঢাকা-১২১৬",
  hoursEn: "Open every day", hoursBn: "প্রতিদিন খোলা",
  facebookUrl: "https://www.facebook.com/homeinnbd14",
  instagramUrl: "https://www.instagram.com/homeinnbd",
  youtubeUrl: null,
  establishedYear: 2015, corporateProjectCount: 73,
  residentialProjectCount: 57, districtCount: 13,
};

describe("canonicalFor", () => {
  it("prefixes the locale", () => {
    expect(canonicalFor("bn", "/services")).toBe("http://localhost:3000/bn/services");
  });

  it("handles the home route without a trailing slash", () => {
    expect(canonicalFor("en", "/")).toBe("http://localhost:3000/en");
  });
});

describe("alternatesFor", () => {
  it("declares both languages plus x-default", () => {
    expect(alternatesFor("en", "/services")).toEqual({
      canonical: "http://localhost:3000/en/services",
      languages: {
        en: "http://localhost:3000/en/services",
        bn: "http://localhost:3000/bn/services",
        "x-default": "http://localhost:3000/en/services",
      },
    });
  });
});

describe("metadataFromSeo", () => {
  const fallback = { title: "Services", description: "Seven services." };

  it("prefers the CMS values when they exist", () => {
    const seo = {
      titleEn: "Interior services", titleBn: "ইন্টেরিয়র সেবা",
      descriptionEn: "What we offer.", descriptionBn: "আমরা যা দিই।",
    };
    expect(metadataFromSeo(seo, "bn", fallback))
      .toEqual({ title: "ইন্টেরিয়র সেবা", description: "আমরা যা দিই।" });
  });

  it("derives from the fallback when no Seo row exists", () => {
    // Nothing writes Seo rows until Plan 1C, so this is the live path.
    expect(metadataFromSeo(null, "en", fallback)).toEqual(fallback);
  });

  it("falls back field by field, not all or nothing", () => {
    const seo = {
      titleEn: "Interior services", titleBn: "ইন্টেরিয়র সেবা",
      descriptionEn: null, descriptionBn: null,
    };
    expect(metadataFromSeo(seo, "en", fallback))
      .toEqual({ title: "Interior services", description: "Seven services." });
  });
});

describe("localBusinessJsonLd", () => {
  it("carries the real NAP", () => {
    const json = localBusinessJsonLd(settings, "en");
    expect(json["@type"]).toBe("LocalBusiness");
    expect(json.telephone).toEqual(["01760775454", "01818843999"]);
    expect(json.email).toBe("homeinnbd14@gmail.com");
    expect(json.address.streetAddress).toContain("Mirpur-10");
  });

  it("lists only the social profiles that exist", () => {
    expect(localBusinessJsonLd(settings, "en").sameAs).toEqual([
      "https://www.facebook.com/homeinnbd14",
      "https://www.instagram.com/homeinnbd",
    ]);
  });

  it("uses the Bangla address for bn", () => {
    expect(localBusinessJsonLd(settings, "bn").address.streetAddress).toContain("মিরপুর");
  });
});

describe("telephone in JSON-LD", () => {
  it("is a bare string when there is only one line", () => {
    const one = { ...settings, phoneSecondary: null, whatsappSecondary: null };
    expect(localBusinessJsonLd(one, "en").telephone).toBe("01760775454");
  });

  it("ignores a whitespace-only second line", () => {
    const blank = { ...settings, phoneSecondary: "   " };
    expect(localBusinessJsonLd(blank, "en").telephone).toBe("01760775454");
  });
});

describe("breadcrumbJsonLd", () => {
  it("numbers the trail from one", () => {
    const json = breadcrumbJsonLd("en", [
      { name: "Services", path: "/services" },
      { name: "Interior Design", path: "/services/interior-design" },
    ]);
    expect(json.itemListElement[0]).toMatchObject({ position: 1, name: "Services" });
    expect(json.itemListElement[1]).toMatchObject({
      position: 2, item: "http://localhost:3000/en/services/interior-design",
    });
  });
});

describe("articleJsonLd", () => {
  const post = {
    slug: "a", titleEn: "A", titleBn: "ক", excerptEn: "x", excerptBn: "ক্স",
    publishedAt: "2026-03-14T00:00:00.000Z",
  };

  it("describes the post", () => {
    const json = articleJsonLd(post, "en");
    expect(json["@type"]).toBe("Article");
    expect(json.headline).toBe("A");
    expect(json.datePublished).toBe("2026-03-14T00:00:00.000Z");
    expect(json.mainEntityOfPage).toBe("http://localhost:3000/en/blog/a");
  });

  it("omits datePublished when the post has no date", () => {
    expect(articleJsonLd({ ...post, publishedAt: null }, "en").datePublished).toBeUndefined();
  });
});
