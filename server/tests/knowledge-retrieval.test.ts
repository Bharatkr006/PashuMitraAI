import { describe, it, expect } from "vitest";
import {
  retrieve,
  loadKnowledgeBase,
  getHighestUrgency,
  formatSources,
} from "../src/core/knowledge-retrieval.js";

describe("Knowledge Base Loading", () => {
  it("kb loads successfully", () => {
    const kb = loadKnowledgeBase();
    expect(Array.isArray(kb)).toBe(true);
    expect(kb.length).toBeGreaterThan(0);
  });

  it("kb has minimum entries", () => {
    const kb = loadKnowledgeBase();
    expect(kb.length).toBeGreaterThanOrEqual(15);
  });

  it("all entries have required fields", () => {
    const kb = loadKnowledgeBase();
    const required = ["id", "species", "urgency", "general_guidance", "source_name", "source_url"];
    for (const entry of kb) {
      for (const field of required) {
        expect((entry as any)[field]).toBeDefined();
      }
    }
  });

  it("no empty source urls", () => {
    const kb = loadKnowledgeBase();
    for (const entry of kb) {
      expect(entry.source_url).toBeTruthy();
    }
  });

  it("urgency values valid", () => {
    const kb = loadKnowledgeBase();
    const validUrgency = new Set(["emergency", "prompt", "general"]);
    for (const entry of kb) {
      expect(validUrgency.has(entry.urgency)).toBe(true);
    }
  });
});

describe("Knowledge Retrieval", () => {
  it("bloat query finds bloat entry", () => {
    const result = retrieve("भैंस का पेट फूला हुआ है अफारा", undefined, 3);
    expect(result.source_found).toBe(true);
    const ids = result.results.map((r) => r.id);
    expect(ids).toContain("CB002");
  });

  it("appetite loss finds entry", () => {
    const result = retrieve("गाय खाना नहीं खा रही है", undefined, 3);
    expect(result.source_found).toBe(true);
    expect(result.results.some((entry) => entry.id === "GEN001")).toBe(false);
    expect(getHighestUrgency(result.results)).toBe("prompt");
  });

  it("cough does not match breathing-emergency guidance by spelling similarity", () => {
    const result = retrieve("बकरी को खाँसी है", "goat", 3, 0.5);
    expect(result.results.some((entry) => entry.id === "GS001")).toBe(true);
    expect(result.results.some((entry) => entry.id === "GEN007")).toBe(false);
    expect(getHighestUrgency(result.results)).toBe("prompt");
  });

  it("everyday Hindi bloat wording finds the emergency entry", () => {
    const result = retrieve("मेरी गाय का पेट फूल गया है", "cattle", 3, 0.5);
    expect(result.results.some((entry) => entry.id === "CB002")).toBe(true);
    expect(getHighestUrgency(result.results)).toBe("emergency");
  });

  it("Hindi appetite and diarrhea samples retrieve species-relevant entries", () => {
    const appetite = retrieve("मेरी गाय खाना नहीं खा रही है।", "cattle", 3, 0.5);
    const diarrhea = retrieve("मेरी बकरी को दस्त हो रहे हैं।", "goat", 3, 0.5);
    expect(appetite.results.some((entry) => entry.id === "CB001")).toBe(true);
    expect(diarrhea.results.some((entry) => entry.id === "GS002")).toBe(true);
    expect(diarrhea.results.every((entry) => entry.species.includes("goat"))).toBe(true);
  });

  it("diarrhea goat finds entry", () => {
    const result = retrieve("बकरी को दस्त हो रहे हैं", "goat", 3);
    expect(result.source_found).toBe(true);
  });

  it("rajasthani bloat word finds entry", () => {
    const result = retrieve("आफरो आयो भैंस को", undefined, 3);
    expect(result.source_found).toBe(true);
  });

  it.each([
    "hao koi bat ko ni meri gaay dudh km de rhi se",
    "गाय का दूध कम हो गया है",
    "म्हारी गाय दूध घट गयो",
    "My cow's milk production is down",
  ])("reduced milk query %s finds prompt entry without emergencies", (query) => {
    const result = retrieve(query, "cattle", 3, 0.5);
    const ids = result.results.map((entry) => entry.id);
    expect(ids).toContain("CB005");
    expect(result.results.every((entry) => entry.urgency !== "emergency")).toBe(true);
  });

  it("vaccination query finds entry", () => {
    const result = retrieve("टीका कब लगवाएं", undefined, 3);
    expect(result.source_found).toBe(true);
    const ids = result.results.map((r) => r.id);
    expect(ids).toContain("GEN002");
  });

  it("poisoning query finds entry", () => {
    const result = retrieve("जानवर ने ज़हरीला खाया", undefined, 3);
    expect(result.source_found).toBe(true);
  });

  it("unrelated query returns low score or empty", () => {
    const result = retrieve("कल मौसम कैसा रहेगा", undefined, 3, 2.0);
    for (const r of result.results) {
      expect(r.score).toBeLessThan(10);
    }
  });

  it("retrieval has timing info", () => {
    const result = retrieve("गाय बीमार है");
    expect(result.retrieval_time_ms).toBeDefined();
    expect(result.retrieval_time_ms).toBeGreaterThanOrEqual(0);
  });

  it("kb size reported", () => {
    const result = retrieve("बकरी");
    expect(result.kb_size).toBeGreaterThan(0);
  });

  it("species filter works", () => {
    const result = retrieve("दस्त", "cattle", 5);
    for (const r of result.results) {
      const species = r.species || [];
      expect(
        species.includes("cattle") || species.includes("buffalo") || species.includes("all")
      ).toBe(true);
    }
  });

  it("sources have names", () => {
    const result = retrieve("गाय को बुखार है", undefined, 3);
    for (const r of result.results) {
      expect(r.source_name).toBeTruthy();
    }
  });
});

describe("Urgency From Results", () => {
  it("emergency entry returns emergency", () => {
    const result = retrieve("पेट फूला", undefined, 3);
    for (const r of result.results) {
      if (r.id === "CB002") {
        const urgency = getHighestUrgency(result.results);
        expect(urgency).toBe("emergency");
        break;
      }
    }
  });

  it("general entries return general or prompt", () => {
    const result = retrieve("टीका", undefined, 3);
    const urgency = getHighestUrgency(result.results);
    expect(["general", "prompt"]).toContain(urgency);
  });

  it("empty results return general", () => {
    const urgency = getHighestUrgency([]);
    expect(urgency).toBe("general");
  });
});

describe("Format Sources", () => {
  it("empty results returns not found message", () => {
    const output = formatSources([]);
    expect(output.includes("नहीं") || output.includes("No source")).toBe(true);
  });

  it("results with source formatted", () => {
    const mockResults = [
      {
        source_name: "ICAR Test",
        source_url: "https://icar.org.in",
        last_verified: "2024-01-15",
      },
    ];
    const output = formatSources(mockResults);
    expect(output).toContain("ICAR Test");
    expect(output).toContain("icar.org.in");
  });
});
