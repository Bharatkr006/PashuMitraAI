import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as rg from "../src/core/response-generator.js";
import { retrieve } from "../src/core/knowledge-retrieval.js";
import { checkEmergency } from "../src/core/safety-rules.js";

describe("Response Generator", () => {
  const originalEnv = process.env.GROQ_API_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.GROQ_API_KEY = originalEnv;
  });

  it("example placeholder is not a real key", () => {
    process.env.GROQ_API_KEY = "your_groq_api_key_here";
    expect(rg.isGroqKeyConfigured()).toBe(false);
  });

  it("configured key reports boolean only", () => {
    process.env.GROQ_API_KEY = "gsk_test_placeholder_not_real";
    expect(rg.isGroqKeyConfigured()).toBe(true);
  });

  it("hindi fallback is localized", async () => {
    const result = await rg.generateResponse(
      "गाय को बुखार है",
      [
        {
          score: 1.0,
          id: "TEST1",
          species: ["cattle"],
          urgency: "prompt",
          general_guidance: "English guidance",
          source_name: "Example source",
          source_url: "https://example.com",
          last_verified: "2024-01-01",
          limitations: "English limitation",
          red_flags: [],
          symptoms: ["बुखार"],
        },
      ],
      "cattle",
      false,
      "hindi"
    );
    expect(result.response_text).toContain("**क्या हो सकता है:**");
    expect(result.response_text).toContain("पशु चिकित्सक");
    expect(result.response_text).toContain("साफ पानी उपलब्ध रखें");
    expect(result.response_text).toContain("लक्षण कब से हैं?");
    expect(result.response_text).not.toContain("ज़रूर मिलें");
    expect(result.response_text).not.toContain("English guidance");
    expect(result.llm_used).toBe(false);
    expect(result.response_mode).toBe("Offline fallback");
    expect(result.response_path).toBe("offline fallback");
  });

  it("prompt asks for evidence-based next steps without blanket vet advice", () => {
    const prompt = rg.systemPrompt("hindi");
    expect(prompt).toContain("2–4 concrete, safe next steps");
    expect(prompt).toContain("Do not end every answer with a blanket recommendation");
    expect(prompt).toContain("When no relevant context is supplied, still answer cautiously");
    expect(prompt).not.toContain("If the context is missing or insufficient, say reliable information was not found");
    expect(prompt).not.toContain("कृपया पशु चिकित्सक से ज़रूर मिलें");
  });

  it("rejects quantities not present in the supplied knowledge context", () => {
    expect(rg.hasUnsupportedVeterinaryQuantities(
      "बकरी को 50 मि.ली. ओआरएस दें",
      "Guidance: Provide ORS and keep the animal warm and dry."
    )).toBe(true);
    expect(rg.hasUnsupportedVeterinaryQuantities(
      "सामान्य तापमान 38–39 °C है",
      "Guidance: Normal temperature is 38–39°C."
    )).toBe(false);
    expect(rg.hasUnsupportedVeterinaryQuantities(
      "24 घंटे से अधिक समय तक लक्षण रहें",
      "Red flag: symptoms persist for more than 24 hours."
    )).toBe(false);
    expect(rg.hasUnsupportedVeterinaryQuantities(
      "अनाज 1–2 हिस्से में दें",
      ""
    )).toBe(true);
    expect(rg.hasUnsupportedVeterinaryQuantities(
      "1. साफ पानी रखें\n2. ताज़ा चारा दें",
      ""
    )).toBe(false);
    expect(rg.hasUnsupportedVeterinaryQuantities(
      "4 साल की गाय के लिए",
      "",
      "मेरी गाय 4 साल की है"
    )).toBe(false);
  });

  it("rejects invented home-remedy recipes", () => {
    expect(rg.hasUnsupportedHomeRemedy(
      "घर पर बना ओआरएस (नमक, चीनी और पानी) दें",
      "Guidance: Provide ORS."
    )).toBe(true);
    expect(rg.hasUnsupportedHomeRemedy(
      "ओआरएस दें",
      "Guidance: Provide ORS."
    )).toBe(false);
  });

  it("missing provider and missing retrieval report a provider error, not an answer", async () => {
    process.env.GROQ_API_KEY = "your_groq_api_key_here";
    const result = await rg.generateResponse(
      "What should I feed a healthy dairy cow?",
      [],
      "cattle",
      true,
      "hindi"
    );

    expect(result.response_source).toBe("provider_error");
    expect(result.response_mode).toBe("Provider unavailable");
    expect(result.llm_error_category).toBe("missing_api_key");
    expect(result.response_text).toContain("AI उत्तर सेवा अभी उपलब्ध नहीं है");
    expect(result.sources).toHaveLength(0);
    expect(result.cannot_determine).toBeNull();
  });

  it("rajasthani fallback is localized", async () => {
    const result = await rg.generateResponse(
      "गाय खावै कोनी",
      [
        {
          score: 1.0,
          id: "TEST1",
          species: ["cattle"],
          urgency: "prompt",
          general_guidance: "English guidance",
          source_name: "Example source",
          source_url: "https://example.com",
          last_verified: "2024-01-01",
          limitations: "English limitation",
          red_flags: [],
          symptoms: [],
        },
      ],
      "cattle",
      false,
      "rajasthani"
    );
    expect(result.response_text).toContain("पशु डॉक्टर");
    expect(result.response_text).not.toContain("English guidance");
  });

  it("low milk fallback asks follow up in hindi without generic no info", async () => {
    const result = await rg.generateResponse(
      "गाय का दूध कम हो गया है",
      [
        {
          score: 1.0,
          id: "CB005",
          species: ["cattle"],
          urgency: "prompt",
          general_guidance: "",
          source_name: "KB source",
          source_url: "",
          last_verified: "",
          limitations: "",
          red_flags: [],
          symptoms: [],
        },
      ],
      "cattle",
      false,
      "hindi"
    );
    expect(result.response_text).toContain("दूध कब से कम है");
    expect(result.response_text).toContain("थन");
    expect(result.response_text).toContain("पशु चिकित्सक");
    expect(result.response_text).not.toContain("भरोसेमंद जानकारी नहीं मिली");
  });

  it("low milk fallback asks follow up in rajasthani", async () => {
    const result = await rg.generateResponse(
      "mhari gai dudh ghat gayo",
      [
        {
          score: 1.0,
          id: "CB005",
          species: ["cattle"],
          urgency: "prompt",
          general_guidance: "",
          source_name: "KB source",
          source_url: "",
          last_verified: "",
          limitations: "",
          red_flags: [],
          symptoms: [],
        },
      ],
      "cattle",
      false,
      "rajasthani"
    );
    expect(result.response_text).toContain("दूध कद सूँ कम है");
    expect(result.response_text).toContain("पशु डॉक्टर");
  });

  it("low milk without kb still asks for details", async () => {
    const result = await rg.generateResponse(
      "meri gai ka doodh kam ho raha",
      [],
      "cattle",
      false,
      "hindi"
    );
    expect(result.response_text).toContain("दूध कब से कम है");
    expect(result.response_text).not.toContain("भरोसेमंद जानकारी नहीं मिली");
  });

  it("genuine emergency returns safety guidance without groq", async () => {
    const emergency = checkEmergency("my cow is gasping and has open mouth breathing");
    expect(emergency.is_emergency).toBe(true);

    const callSpy = vi.spyOn(rg, "callGroq").mockImplementation(async () => {
      throw new Error("Groq must not be called for an emergency");
    });

    const result = await rg.generateResponse(
      "my cow is gasping",
      [],
      "cattle",
      true,
      "hindi",
      emergency
    );

    expect(result.response_text).toContain("तुरंत पशु चिकित्सक");
    expect(result.response_path).toBe("emergency rule");
    expect(result.llm_used).toBe(false);
    expect(result.llm_error_category).toBe("not_attempted_emergency");
    expect(callSpy).not.toHaveBeenCalled();
  });
});
