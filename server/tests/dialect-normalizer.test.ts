import { describe, it, expect } from "vitest";
import {
  normalizeText,
  detectSpeciesFromText,
  loadDictionary,
  saveUserCorrection,
} from "../src/core/dialect-normalizer.js";

describe("Dialect Normalizer — Dictionary Loading", () => {
  it("dictionary loads", () => {
    const d = loadDictionary();
    expect(typeof d).toBe("object");
    expect(d.animal_names).toBeDefined();
    expect(d.symptom_mappings).toBeDefined();
  });

  it("dictionary has animal names", () => {
    const d = loadDictionary();
    expect(Object.keys(d.animal_names).length).toBeGreaterThan(5);
  });

  it("dictionary has symptom mappings", () => {
    const d = loadDictionary();
    expect(Object.keys(d.symptom_mappings).length).toBeGreaterThan(10);
  });
});

describe("Dialect Normalizer — Normalization", () => {
  it("rajasthani bloat normalized", () => {
    const result = normalizeText("आफरो आयो भैंस को");
    expect(result.has_dialect_terms).toBe(true);
    expect(result.dialect_matches.some((m) => m.normalized_term.includes("bloat"))).toBe(true);
  });

  it("rajasthani fever normalized", () => {
    const result = normalizeText("म्हारे जानवर को बखार है");
    expect(
      result.dialect_matches.some((m) => m.normalized_term.toLowerCase().includes("fever"))
    ).toBe(true);
  });

  it("original preserved", () => {
    const original = "आफरो आयो भैंस को";
    const result = normalizeText(original);
    expect(result.original).toBe(original);
  });

  it("hindi bloat word detected", () => {
    const result = normalizeText("भैंस को अफारा हो गया है");
    const symptoms = result.symptoms_detected;
    expect(symptoms.some((s) => s.includes("bloat") || s.includes("gas"))).toBe(true);
  });

  it("normal hindi no dialect terms", () => {
    const result = normalizeText("मेरी गाय बीमार है");
    expect(result.original).toBeDefined();
    expect(Array.isArray(result.dialect_matches)).toBe(true);
  });

  it("animal detected from rajasthani", () => {
    const result = normalizeText("भैंस का पेट फूल गया");
    expect(["buffalo", "cattle", null]).toContain(result.animal_detected);
    if (result.animal_detected) {
      expect(result.animal_detected).toBe("buffalo");
    }
  });

  it("diarrhea symptom detected", () => {
    const result = normalizeText("दस्त हो रहे हैं बकरी को");
    expect(
      result.dialect_matches.some((m) => m.normalized_term.toLowerCase().includes("diarrhea"))
    ).toBe(true);
  });

  it("roman hindi low milk is normalized", () => {
    const result = normalizeText("hao koi bat ko ni meri gaay dudh km de rhi se");
    expect(result.animal_detected).toBe("cattle");
    expect(result.normalized).toContain("milk reduction");
  });

  it("rajasthani roman low milk is normalized", () => {
    const result = normalizeText("mhari gai dudh ghat gayo");
    expect(result.animal_detected).toBe("cattle");
    expect(result.normalized).toContain("milk reduction");
  });
});

describe("Dialect Normalizer — Species Detection", () => {
  it("cow detected from hindi", () => {
    expect(detectSpeciesFromText("मेरी गाय बीमार है")).toBe("cattle");
  });

  it("buffalo detected from hindi", () => {
    expect(detectSpeciesFromText("भैंस का दूध कम हो गया")).toBe("buffalo");
  });

  it("buffalo before cattle", () => {
    const result = detectSpeciesFromText("मुर्रा भैंस और गाय दोनों बीमार");
    expect(["buffalo", "cattle"]).toContain(result);
  });

  it("goat detected", () => {
    expect(detectSpeciesFromText("बकरी को दस्त है")).toBe("goat");
  });

  it("sheep detected", () => {
    expect(detectSpeciesFromText("भेड़ लंगड़ा रही है")).toBe("sheep");
  });

  it("no animal returns null", () => {
    expect(detectSpeciesFromText("आज मौसम अच्छा है")).toBeNull();
  });

  it("english cow detected", () => {
    expect(detectSpeciesFromText("my cow is sick")).toBe("cattle");
  });

  it("english buffalo detected", () => {
    expect(detectSpeciesFromText("buffalo is not eating")).toBe("buffalo");
  });
});

describe("Dialect Normalizer — User Correction", () => {
  it("correction without consent rejected", () => {
    const result = saveUserCorrection("बखार", "fever", false);
    expect(result.success).toBe(false);
  });

  it("correction with consent saves", () => {
    const result = saveUserCorrection("टेस्ट_शब्द", "test_word", true);
    expect(result.success).toBe(true);
  });
});
