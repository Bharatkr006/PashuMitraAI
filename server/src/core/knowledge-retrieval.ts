import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { normalizeText } from "./dialect-normalizer.js";
import {
  KbEntry,
  RetrievalResult,
  ScoredKbResult,
  UrgencyLevel,
} from "../types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getKbPath(): string {
  const possiblePaths = [
    path.resolve(process.cwd(), "data/veterinary_knowledge.json"),
    path.resolve(__dirname, "../../data/veterinary_knowledge.json"),
    path.resolve(__dirname, "../../../data/veterinary_knowledge.json"),
    path.resolve(__dirname, "../../../../data/veterinary_knowledge.json"),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return possiblePaths[0];
}

let kbCache: KbEntry[] | null = null;
let kbLoadTime = 0;

export function loadKnowledgeBase(forceReload = false): KbEntry[] {
  if (kbCache !== null && !forceReload) {
    return kbCache;
  }
  const kbPath = getKbPath();
  try {
    const start = Date.now();
    const raw = fs.readFileSync(kbPath, "utf-8");
    kbCache = JSON.parse(raw);
    kbLoadTime = Date.now() - start;
    return kbCache || [];
  } catch (err) {
    console.error(`ERROR: Knowledge base not found at ${kbPath}:`, err);
    return [];
  }
}

export function tokenize(text: string): string[] {
  const matches = text.toLowerCase().match(/[\u0900-\u097F]+|[a-zA-Z]+|\d+/g);
  return matches || [];
}

export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      const val = a[i - 1] === b[j - 1] ? row[j - 1] : Math.min(row[j - 1], prev, row[j]) + 1;
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }
  return row[b.length];
}

export function scoreEntry(queryTokens: string[], entry: any): number {
  let score = 0.0;

  const querySet = new Set(queryTokens);
  const queryText = queryTokens.join(" ");
  const symptoms: string[][] = (entry.symptoms || []).map((s: string) => tokenize(s.toLowerCase()));
  const keywordsHi: string[][] = (entry.keywords_hi || []).map((k: string) => tokenize(k.toLowerCase()));
  const keywordsRj: string[][] = (entry.keywords_rj || []).map((k: string) => tokenize(k.toLowerCase()));
  const guidanceTokens = new Set(tokenize((entry.general_guidance || "").toLowerCase()));

  const ambiguousTokens = new Set([
    "milk", "doodh", "dudh", "dud", "cow", "cattle", "animal",
    "पशु", "गाय", "भैंस", "दूध", "दुध",
  ]);

  const ignoredPhraseTokens = new Set([
    "the", "a", "an", "is", "are", "was", "were", "has", "have", "had",
    "का", "की", "के", "है", "हैं", "था", "थी", "थे", "में", "को", "से",
    "और", "नहीं", "हो", "हुआ", "हुई", "गया", "गई", "गयी", "गयो",
    "रहा", "रही", "रहे", "down",
  ]);

  // Check if token matches directly or via close fuzzy edit distance
  function matchesToken(token: string): boolean {
    if (querySet.has(token)) return true;
    if (/^[a-z]+$/i.test(token) && token.length >= 4) {
      for (const q of querySet) {
        if (/^[a-z]+$/i.test(q) && q.length >= 4 && Math.abs(q.length - token.length) <= 1) {
          if (levenshteinDistance(q, token) <= 1) {
            return true;
          }
        }
      }
    }
    return false;
  }

  function phraseScore(phraseTokens: string[], exactScore: number): number {
    if (!phraseTokens.length) {
      return 0.0;
    }
    if (phraseTokens.length === 1) {
      const token = phraseTokens[0];
      return matchesToken(token) && !ambiguousTokens.has(token) ? exactScore : 0.0;
    }
    const phrase = phraseTokens.join(" ");
    if (` ${queryText} `.includes(` ${phrase} `)) {
      return exactScore;
    }
    const distinctiveTokens = phraseTokens.filter(
      (t) => !ignoredPhraseTokens.has(t) && !ambiguousTokens.has(t)
    );
    const matchedTokens = distinctiveTokens.filter((t) => matchesToken(t));
    const minimumMatches = Math.min(2, distinctiveTokens.length);
    if (matchedTokens.length >= minimumMatches && minimumMatches > 0) {
      return exactScore / 2;
    }
    return 0.0;
  }

  let matchedSymptomsCount = 0;
  for (const phraseTokens of symptoms) {
    const sScore = phraseScore(phraseTokens, 3.0);
    if (sScore > 0) {
      matchedSymptomsCount++;
      score += sScore;
    }
  }

  // Multi-symptom co-occurrence synergy bonus
  if (matchedSymptomsCount >= 2) {
    score += 2.0;
  }

  for (const phraseTokens of [...keywordsHi, ...keywordsRj]) {
    score += phraseScore(phraseTokens, 2.5);
  }

  const guidanceMatches = [...querySet].filter(
    (t) => guidanceTokens.has(t) && !ambiguousTokens.has(t) && !ignoredPhraseTokens.has(t)
  );
  if (guidanceMatches.length >= 2) {
    score += 0.5 * guidanceMatches.length;
  }

  return score;
}

export function retrieve(
  query: string,
  species?: string | null,
  topK = 3,
  minScore = 1.0
): RetrievalResult {
  const start = Date.now();
  const kb = loadKnowledgeBase();

  if (!kb || kb.length === 0) {
    return {
      results: [],
      query_tokens: [],
      retrieval_time_ms: 0,
      kb_size: 0,
      source_found: false,
      error: "Knowledge base unavailable",
    };
  }

  const normalizedQuery = normalizeText(query).normalized;
  const queryTokens = tokenize(normalizedQuery);

  const scoredEntries: { score: number; entry: KbEntry }[] = [];

  for (const entry of kb) {
    if (species) {
      const entrySpecies = entry.species || [];
      if (!entrySpecies.includes(species) && !entrySpecies.includes("all")) {
        if (!(species === "buffalo" && entrySpecies.includes("cattle"))) {
          continue;
        }
      }
    }

    const score = scoreEntry(queryTokens, entry);
    if (score >= minScore) {
      scoredEntries.push({ score, entry });
    }
  }

  scoredEntries.sort((a, b) => b.score - a.score);
  const topResults = scoredEntries.slice(0, topK);
  const retrievalTimeMs = Date.now() - start;

  return {
    results: topResults.map(({ score, entry }): ScoredKbResult => ({
      score,
      id: entry.id,
      species: entry.species || [],
      urgency: entry.urgency || "general",
      general_guidance: entry.general_guidance || "",
      red_flags: entry.red_flags || [],
      limitations: entry.limitations || "",
      source_name: entry.source_name || "Unknown",
      source_url: entry.source_url || "",
      last_verified: entry.last_verified || "",
      symptoms: entry.symptoms || [],
    })),
    query_tokens: queryTokens,
    retrieval_time_ms: retrievalTimeMs,
    kb_size: kb.length,
    source_found: topResults.length > 0,
  };
}

export function getHighestUrgency(results: { urgency?: string }[]): UrgencyLevel {
  const urgencyOrder: Record<string, number> = {
    emergency: 3,
    prompt: 2,
    general: 1,
  };
  let maxUrgency: UrgencyLevel = "general";
  for (const r of results) {
    const u = (r.urgency || "general") as UrgencyLevel;
    if ((urgencyOrder[u] || 0) > (urgencyOrder[maxUrgency] || 0)) {
      maxUrgency = u;
    }
  }
  return maxUrgency;
}

export function formatSources(results: { source_name?: string; source_url?: string; last_verified?: string }[]): string {
  if (!results || results.length === 0) {
    return "कोई स्रोत नहीं मिला (No source found in knowledge base)";
  }

  const sources: string[] = [];
  results.forEach((r, idx) => {
    const src = r.source_name || "Unknown";
    const url = r.source_url || "";
    const verified = r.last_verified || "Unknown";
    sources.push(`${idx + 1}. **${src}**\n   URL: ${url}\n   Last verified: ${verified}`);
  });

  return sources.join("\n");
}
