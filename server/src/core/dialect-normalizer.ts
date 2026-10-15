import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { DialectNormalizationResult, DialectMatch } from "../types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getDictPath(): string {
  const possiblePaths = [
    path.resolve(process.cwd(), "data/dialect_dictionary.json"),
    path.resolve(__dirname, "../../data/dialect_dictionary.json"),
    path.resolve(__dirname, "../../../data/dialect_dictionary.json"),
    path.resolve(__dirname, "../../../../data/dialect_dictionary.json"),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return possiblePaths[0];
}

let cachedDictionary: any = null;

export function loadDictionary(): any {
  if (cachedDictionary) {
    return cachedDictionary;
  }
  const dictPath = getDictPath();
  try {
    const raw = fs.readFileSync(dictPath, "utf-8");
    cachedDictionary = JSON.parse(raw);
    return cachedDictionary;
  } catch (err) {
    console.warn(`Warning: Could not load dialect_dictionary.json:`, err);
    return { animal_names: {}, symptom_mappings: {}, common_phrases: {} };
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeSpecies(animalEn: string): string {
  const lower = animalEn.toLowerCase();
  if (lower.includes("cow") || lower.includes("calf") || lower.includes("cattle")) {
    return "cattle";
  } else if (lower.includes("buffalo")) {
    return "buffalo";
  } else if (lower.includes("goat")) {
    return "goat";
  } else if (lower.includes("sheep") || lower.includes("lamb")) {
    return "sheep";
  }
  return animalEn;
}

export function hasReducedMilkIntent(text: string): boolean {
  const textLower = text.toLowerCase();
  const milkTerm = /(?:दूध|दुध|दूघ|दूधिया|\b(?:doodh|dudh|dud|milk)\b)/i.test(textLower);
  const reducedTerm = /(?:कम|घट|घट्यो|घट गयो|घट गया|घट गई|कम हो|कम दे|कम आवे|\b(?:kam|km|kum|ghat|ghatyo|ghato|ghatya|low|less|reduce|reduced|decrease|decreased|decline|drop|dropped|down)\b)/i.test(textLower);
  return Boolean(milkTerm && reducedTerm);
}

function containsSpeciesWord(text: string, word: string): boolean {
  if (/[a-z]/i.test(word)) {
    const regex = new RegExp(`(?<![a-z])${escapeRegex(word)}(?![a-z])`, "i");
    return regex.test(text);
  }
  return text.includes(word);
}

export function detectSpeciesFromText(text: string): string | null {
  const textLower = text.toLowerCase();

  const cattleWords = [
    "गाय", "गइया", "गैया", "बछड़", "cow", "cattle", "गाय का",
    "राठी", "गिर", "gaay", "gai", "gaye",
  ];
  const buffaloWords = ["भैंस", "भैंसा", "पाड़", "buffalo", "murrah", "मुर्रा", "bhains"];
  const goatWords = ["बकरी", "बकरा", "मेमना", "goat", "kid", "bakri", "bakra"];
  const sheepWords = ["भेड़", "भेड़ा", "sheep", "lamb", "नाली", "बाड़मेरी", "bhed"];

  // Buffalo before cattle
  for (const word of buffaloWords) {
    if (containsSpeciesWord(textLower, word)) {
      return "buffalo";
    }
  }
  for (const word of cattleWords) {
    if (containsSpeciesWord(textLower, word)) {
      return "cattle";
    }
  }
  for (const word of goatWords) {
    if (containsSpeciesWord(textLower, word)) {
      return "goat";
    }
  }
  for (const word of sheepWords) {
    if (containsSpeciesWord(textLower, word)) {
      return "sheep";
    }
  }

  return null;
}

export function normalizeText(text: string, dictionary?: any): DialectNormalizationResult {
  const dict = dictionary || loadDictionary();

  const original = text;
  let normalized = text;
  const dialectMatches: DialectMatch[] = [];
  const symptomsDetected: string[] = [];
  let animalDetected: string | null = null;

  // Step 1: Check for whole-phrase mappings (longest match wins)
  const commonPhrases = dict.common_phrases || {};
  const phraseEntries = Object.entries(commonPhrases) as [string, string][];
  phraseEntries.sort((a, b) => b[0].length - a[0].length);

  for (const [phrase, translation] of phraseEntries) {
    if (text.toLowerCase().includes(phrase.toLowerCase())) {
      dialectMatches.push({
        original_term: phrase,
        normalized_term: translation,
        type: "phrase",
      });
    }
  }

  // Step 2: Animal name detection
  const animalNames = dict.animal_names || {};
  const animalEntries = Object.entries(animalNames) as [string, string][];
  animalEntries.sort((a, b) => b[0].length - a[0].length);

  for (const [term, animalEn] of animalEntries) {
    if (text.toLowerCase().includes(term.toLowerCase())) {
      if (animalDetected === null) {
        animalDetected = normalizeSpecies(animalEn);
      }
      dialectMatches.push({
        original_term: term,
        normalized_term: animalEn,
        type: "animal",
      });
    }
  }

  if (animalDetected === null) {
    animalDetected = detectSpeciesFromText(text);
  }

  // Stable concept for reduced milk yield
  if (hasReducedMilkIntent(text)) {
    normalized = `${normalized} milk reduction low milk production`;
    symptomsDetected.push("milk reduction");
    dialectMatches.push({
      original_term: text,
      normalized_term: "reduced milk production",
      type: "symptom",
    });
  }

  // Step 3: Symptom mappings
  const symptomMappings = dict.symptom_mappings || {};
  const symptomEntries = Object.entries(symptomMappings) as [string, string][];
  symptomEntries.sort((a, b) => b[0].length - a[0].length);

  for (const [term, symptomEn] of symptomEntries) {
    if (normalized.toLowerCase().includes(term.toLowerCase())) {
      symptomsDetected.push(symptomEn);
      const reg = new RegExp(escapeRegex(term), "gi");
      normalized = normalized.replace(reg, `${term}(${symptomEn})`);
      dialectMatches.push({
        original_term: term,
        normalized_term: symptomEn,
        type: "symptom",
      });
    }
  }

  // Step 4: Remove duplicate symptoms
  const uniqueSymptoms = Array.from(new Set(symptomsDetected));

  return {
    original,
    normalized,
    animal_detected: animalDetected,
    symptoms_detected: uniqueSymptoms,
    dialect_matches: dialectMatches,
    has_dialect_terms: dialectMatches.length > 0,
  };
}

export function saveUserCorrection(
  originalTerm: string,
  correctedTerm: string,
  consent = false
): { success: boolean; reason?: string; message?: string } {
  if (!consent) {
    return { success: false, reason: "User consent not given" };
  }

  try {
    const dictPath = getDictPath();
    let data: any = { animal_names: {}, symptom_mappings: {}, common_phrases: {} };
    if (fs.existsSync(dictPath)) {
      data = JSON.parse(fs.readFileSync(dictPath, "utf-8"));
    }

    const correction = {
      original: originalTerm,
      corrected: correctedTerm,
      submitted_anonymously: true,
      note: "User correction — requires manual review before adding to main dictionary",
    };

    if (!data.corrections_contributed) {
      data.corrections_contributed = [];
    }

    data.corrections_contributed.push(correction);
    fs.writeFileSync(dictPath, JSON.stringify(data, null, 2), "utf-8");
    cachedDictionary = data;

    return { success: true, message: "Correction saved for review. Thank you!" };
  } catch (err: any) {
    return { success: false, reason: err?.message || String(err) };
  }
}
