import { describe, it, expect } from "vitest";
import {
  checkEmergency,
  checkPrescriptionRequest,
  getUrgencyFromKeywords,
  getUrgencyDisplay,
  URGENCY_EMERGENCY,
  URGENCY_PROMPT,
  URGENCY_GENERAL,
} from "../src/core/safety-rules.js";

describe("Safety Rules — Emergency Detection", () => {
  it("hindi collapse triggers emergency", () => {
    const result = checkEmergency("मेरी गाय गिर गई है");
    expect(result.is_emergency).toBe(true);
    expect(result.urgency).toBe(URGENCY_EMERGENCY);
  });

  it("rajasthani collapse triggers emergency", () => {
    const result = checkEmergency("भैंस गिर गयो खड़ो नई थ्यो");
    expect(result.is_emergency).toBe(true);
  });

  it("cannot stand triggers emergency", () => {
    const result = checkEmergency("गाय खड़ी नहीं हो पा रही");
    expect(result.is_emergency).toBe(true);
  });

  it("poisoning triggers emergency", () => {
    const result = checkEmergency("जानवर ने कुछ ज़हरीला खा लिया तड़प रहा है");
    expect(result.is_emergency).toBe(true);
  });

  it("difficult birth triggers emergency", () => {
    const result = checkEmergency("बकरी का बच्चा नहीं निकल रहा, घंटे से कोशिश कर रही है");
    expect(result.is_emergency).toBe(true);
  });

  it("bloat strong wording triggers emergency", () => {
    const result = checkEmergency("भैंस का पेट बहुत ज़्यादा फूला हुआ है");
    expect(result.is_emergency).toBe(true);
  });

  it("open mouth breathing triggers emergency", () => {
    const result = checkEmergency("जानवर मुँह खोलकर साँस ले रहा है");
    expect(result.is_emergency).toBe(true);
  });

  it("normal appetite loss no emergency", () => {
    const result = checkEmergency("मेरी गाय खाना नहीं खा रही है");
    expect(result.is_emergency).toBe(false);
  });

  it("normal diarrhea no emergency", () => {
    const result = checkEmergency("बकरी को दस्त हो रहे हैं");
    expect(result.is_emergency).toBe(false);
  });

  it("low milk alone is not emergency", () => {
    const result = checkEmergency("hao koi bat ko ni meri gaay dudh km de rhi se");
    expect(result.is_emergency).toBe(false);
  });

  it("milk yield down is not an emergency", () => {
    const res1 = checkEmergency("My cow's milk production is down");
    expect(res1.is_emergency).toBe(false);

    const res2 = checkEmergency("cow down and milk production is low");
    expect(res2.is_emergency).toBe(true);
  });

  it("roman hindi collapse is emergency", () => {
    const result = checkEmergency("meri gai gir gai hai aur uth nahi pa rahi");
    expect(result.is_emergency).toBe(true);
  });

  it("roman hindi breathing difficulty is emergency", () => {
    const result = checkEmergency("meri gai saans nahi le pa rahi");
    expect(result.is_emergency).toBe(true);
  });

  it("common Hindi breathing difficulty wording is emergency", () => {
    const result = checkEmergency("मेरी गाय का पेट फूल गया है और उसे सांस लेने में परेशानी हो रही है।");
    expect(result.is_emergency).toBe(true);
  });

  it("vaccination question no emergency", () => {
    const result = checkEmergency("पशु को कौन सा टीका लगवाना चाहिए");
    expect(result.is_emergency).toBe(false);
  });

  it("emergency message hi present", () => {
    const result = checkEmergency("गाय गिर गई है");
    expect(result.message_hi).not.toBeNull();
    expect(result.message_hi!.length).toBeGreaterThan(10);
  });

  it("matched keywords returned", () => {
    const result = checkEmergency("जानवर ने ज़हर खा लिया");
    expect(result.matched_keywords.length).toBeGreaterThan(0);
  });

  it("empty string no emergency", () => {
    const result = checkEmergency("");
    expect(result.is_emergency).toBe(false);
  });

  it("english collapse triggers emergency", () => {
    const result = checkEmergency("The cow has collapsed and cannot stand");
    expect(result.is_emergency).toBe(true);
  });
});

describe("Safety Rules — Prescription Detection", () => {
  it("antibiotic dosage detected", () => {
    const result = checkPrescriptionRequest("एमोक्सिसिलिन कितनी देनी चाहिए");
    expect(result.is_prescription_request).toBe(true);
  });

  it("english antibiotic detected", () => {
    const result = checkPrescriptionRequest("How much amoxicillin to give my cow");
    expect(result.is_prescription_request).toBe(true);
  });

  it("safe message provided", () => {
    const result = checkPrescriptionRequest("oxytetracycline dose for buffalo");
    expect(result.message_hi).not.toBeNull();
    expect(result.message_hi).toContain("पशु चिकित्सक");
  });

  it("normal query not prescription", () => {
    const result = checkPrescriptionRequest("मेरी गाय खाना नहीं खा रही");
    expect(result.is_prescription_request).toBe(false);
  });

  it("vaccination not prescription", () => {
    const result = checkPrescriptionRequest("टीका कब लगवाएं");
    expect(result.is_prescription_request).toBe(false);
  });
});

describe("Safety Rules — Urgency Logic", () => {
  it("emergency overrides general kb", () => {
    const urgency = getUrgencyFromKeywords("गाय गिर गई है", URGENCY_GENERAL);
    expect(urgency).toBe(URGENCY_EMERGENCY);
  });

  it("emergency overrides prompt kb", () => {
    const urgency = getUrgencyFromKeywords("जानवर ने ज़हर खाया", URGENCY_PROMPT);
    expect(urgency).toBe(URGENCY_EMERGENCY);
  });

  it("kb urgency used when no emergency", () => {
    const urgency = getUrgencyFromKeywords("गाय खाना कम खा रही है", URGENCY_PROMPT);
    expect(urgency).toBe(URGENCY_PROMPT);
  });

  it("general when nothing", () => {
    const urgency = getUrgencyFromKeywords("गाय अच्छी है", null);
    expect(urgency).toBe(URGENCY_GENERAL);
  });
});

describe("Safety Rules — Urgency Display", () => {
  it("emergency display has red color", () => {
    const disp = getUrgencyDisplay(URGENCY_EMERGENCY);
    expect(disp.color.toUpperCase().includes("#FF") || disp.color.toLowerCase().includes("red")).toBe(true);
  });

  it("all urgency levels have labels", () => {
    for (const level of [URGENCY_EMERGENCY, URGENCY_PROMPT, URGENCY_GENERAL]) {
      const disp = getUrgencyDisplay(level);
      expect(disp.label).toBeDefined();
      expect(disp.advice_hi).toBeDefined();
      expect(disp.label.length).toBeGreaterThan(3);
    }
  });
});
