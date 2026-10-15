import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Groq } from "groq-sdk";
import { hasReducedMilkIntent } from "./dialect-normalizer.js";
import { getHighestUrgency } from "./knowledge-retrieval.js";
import {
  EmergencyCheckResult,
  ResponseData,
  ScoredKbResult,
  UrgencyLevel,
} from "../types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export const GROQ_MODEL = "openai/gpt-oss-20b";
export const GROQ_TIMEOUT_MS = 15000;

export function isGroqKeyConfigured(): boolean {
  const key = (process.env.GROQ_API_KEY || "").trim();
  return Boolean(key && key !== "your_groq_api_key_here");
}

export function systemPrompt(languageMode: string): string {
  let languageInstruction = "";

  if (languageMode === "rajasthani") {
    languageInstruction =
      "Reply in simple, respectful Rajasthani-friendly conversational language. " +
      "Use commonly understood regional expressions where reliable. Do not claim perfect " +
      "dialect fluency; if uncertain, use clear simple Hindi, never default to English.";
  } else {
    languageInstruction =
      "Reply in simple, natural Hindi written in Devanagari, suitable for rural livestock " +
      "owners. Do not answer in English except for necessary source names or technical terms.";
  }

  return `You are PashuMitra AI, a cautious veterinary information assistant for rural livestock owners in India.

LANGUAGE REQUIREMENT: ${languageInstruction}

SAFETY AND ANSWER QUALITY RULES:
1. When relevant knowledge-base context is supplied, use it as the primary source and do not contradict it.
2. When context is supplied, it is the ONLY source for veterinary claims: do not add diseases, symptoms, tests, thresholds, remedies, feed quantities, or facts that are not explicitly in it. Use no numerical quantity unless that exact quantity and unit appear in the context.
3. When no relevant context is supplied, still answer cautiously: give safe, general next steps and ask for details when needed. Clearly say it is general and not verified against this app's knowledge base; do not invent sources, diagnoses, treatments, recipes, or numerical quantities.
4. Do not diagnose definitively from a short text description.
5. Never prescribe drugs, antibiotics, or medication dosages.
6. Never recommend invasive procedures or risky home remedies.
7. Never provide a homemade ORS recipe or preparation instructions unless the supplied context explicitly includes them.
8. Explain what the reported symptoms may indicate only as possibilities, not a diagnosis.
9. Give 2–4 concrete, safe next steps supported by the context or conservative general animal-care knowledge. Do not replace these with a generic instruction to visit a veterinarian.
10. State urgency accurately. For serious or emergency symptoms, recommend immediate veterinary attention. For non-emergency symptoms, give practical monitoring/support steps and recommend veterinary help only when needed or when symptoms are serious, persistent, or worsening.
11. List relevant warning signs that change the urgency.
12. Do not fabricate sources, phone numbers, clinical facts, or citations.
13. Answer in at most 100 words with no tables and no repeated warning lists. Use short, localized headings and one or two follow-up questions only if useful.
14. If important details are missing, ask one or two short follow-up questions that would change the advice.
15. For reduced milk yield, ask about duration, feed and water intake, recent calving, stress/heat,
    and udder or milk changes. Recommend prompt veterinary examination for fever, a hot/swollen/painful
    udder, blood or clots in milk, or pain during milking. Do not call reduced milk yield alone an emergency.

Do not end every answer with a blanket recommendation to visit a veterinarian. Match the advice to the evidence and urgency.
`;
}

const VETERINARY_QUANTITY_PATTERN =
  /(?:\d+(?:[.,]\d+)?|[०-९]+(?:[.,][०-९]+)?)(?:\s*[-–—]\s*(?:\d+(?:[.,]\d+)?|[०-९]+(?:[.,][०-९]+)?))?\s*(?:kg|kgs|kilograms?|g|grams?|ml|millilit(?:er|re)s?|l|lit(?:er|re)s?|°\s*c|celsius|mg|milligrams?|%|किलो|किलोग्राम|ग्राम|मिलीलीटर|मि\.?\s*ली\.?|लीटर|दिन|घंटे|घंटा|घंटों|सप्ताह|हफ्ते|महीने|महीना|साल|वर्ष|बार|times?|hours?|days?|weeks?|months?|years?|parts?|portions?|servings?|handfuls?|meals?|feeds?|हिस्सा|हिस्से|भाग|मुट्ठी)/giu;

function normalizeQuantityText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[०-९]/g, (digit) => String("०१२३४५६७८९".indexOf(digit)))
    .replace(/[–—−]/g, "-")
    .replace(/(?:hours?|घंटे|घंटा|घंटों)/g, "hour")
    .replace(/(?:days?|दिन)/g, "day")
    .replace(/(?:weeks?|सप्ताह|हफ्ते)/g, "week")
    .replace(/(?:months?|महीने|महीना)/g, "month")
    .replace(/(?:kilograms?|kgs?|किलोग्राम|किलो)/g, "kg")
    .replace(/(?:millilit(?:er|re)s?|मिलीलीटर|मि\.?ली\.?)/g, "ml")
    .replace(/(?:lit(?:er|re)s?|लीटर)/g, "l")
    .replace(/(?:grams?|ग्राम)/g, "g")
    .replace(/(?:celsius|सेल्सियस)/g, "°c")
    .replace(/\s+/g, "");
}

export function hasUnsupportedVeterinaryQuantities(
  answer: string,
  context: string,
  userQuery = ""
): boolean {
  const allowedSource = `${context}\n${userQuery}`;
  const allowedQuantities = new Set(
    (allowedSource.match(VETERINARY_QUANTITY_PATTERN) || []).map(normalizeQuantityText)
  );
  const answerQuantities = (answer.match(VETERINARY_QUANTITY_PATTERN) || []).map(normalizeQuantityText);
  return answerQuantities.some((quantity) => !allowedQuantities.has(quantity));
}

export function hasUnsupportedHomeRemedy(answer: string, context: string): boolean {
  const recipePatterns = [
    /homemade\s+(?:ors|oral rehydration solution)/i,
    /घर\s*पर\s*(?:बना|तैयार)\s*(?:हुआ\s*)?(?:ओआरएस|घोल)/i,
    /नमक.{0,24}चीनी.{0,24}(?:पानी|जल)/i,
  ];
  return recipePatterns.some(
    (pattern) => pattern.test(answer) && !pattern.test(context)
  );
}

export async function callGroq(
  userQuery: string,
  kbContext: string,
  languageMode = "hindi"
): Promise<{
  success: boolean;
  error_category?: string;
  text?: string | null;
  latency_ms: number;
  model?: string;
}> {
  const apiKey = (process.env.GROQ_API_KEY || "").trim();
  if (!apiKey || apiKey === "your_groq_api_key_here") {
    console.error("[chat:provider] Groq API key is not configured");
    return {
      success: false,
      error_category: "missing_api_key",
      text: null,
      latency_ms: 0,
    };
  }

  const messages: any[] = [
    { role: "system", content: systemPrompt(languageMode) },
    {
      role: "user",
      content:
        `Selected response language: ${languageMode}\n` +
        `VETERINARY KNOWLEDGE CONTEXT:\n${kbContext}\n` +
        `USER QUESTION:\n${userQuery}\n` +
        (kbContext.startsWith("No relevant veterinary information")
          ? "No relevant knowledge-base entry was retrieved. Give cautious, clearly labeled general guidance in the selected language, without claiming it is verified or sourced."
          : "Use the relevant supplied context, explain uncertainty, and answer in the selected language."),
    },
  ];

  const start = Date.now();
  try {
    const client = new Groq({
      apiKey,
      timeout: GROQ_TIMEOUT_MS,
      maxRetries: 0,
    });

    const requestCompletion = (requestMessages: any[]) =>
      client.chat.completions.create({
        model: GROQ_MODEL,
        messages: requestMessages,
        max_completion_tokens: 2048,
        reasoning_format: "hidden",
        temperature: 0.2,
      });

    let completion = await requestCompletion(messages);
    let answer = (completion.choices[0]?.message?.content || "").trim();
    let latencyMs = Date.now() - start;
    let finishReason = completion.choices[0]?.finish_reason || "unknown";
    let qualityError = answer && finishReason === "length"
      ? "truncated_model_response"
      : answer && hasUnsupportedVeterinaryQuantities(answer, kbContext, userQuery)
        ? "unsupported_quantity_in_response"
        : answer && hasUnsupportedHomeRemedy(answer, kbContext)
          ? "unsupported_home_remedy_in_response"
          : null;
    let safetyRetry = false;

    if (!answer) {
      console.error("[chat:provider] Groq returned an empty response", {
        model: GROQ_MODEL,
        latency_ms: latencyMs,
        finish_reason: finishReason,
      });
      return {
        success: false,
        error_category: "empty_model_response",
        text: null,
        latency_ms: latencyMs,
      };
    }

    if (qualityError) {
      safetyRetry = true;
      console.warn("[chat:provider] Retrying an answer rejected by safety checks", {
        model: GROQ_MODEL,
        reason: qualityError,
      });
      completion = await requestCompletion([
        ...messages,
        { role: "assistant", content: answer },
        {
          role: "user",
          content:
            "Rewrite your draft in at most 80 words. Remove every numerical quantity, measurement, ratio, and homemade remedy instruction unless explicitly present in the supplied knowledge context. Do not add any new medical fact. For a general husbandry question without context, give only short qualitative advice and no quantities. Return only the corrected answer.",
        },
      ]);
      answer = (completion.choices[0]?.message?.content || "").trim();
      latencyMs = Date.now() - start;
      finishReason = completion.choices[0]?.finish_reason || "unknown";
      qualityError = !answer || finishReason === "length"
        ? "truncated_model_response"
        : hasUnsupportedVeterinaryQuantities(answer, kbContext, userQuery)
          ? "unsupported_quantity_in_response"
          : hasUnsupportedHomeRemedy(answer, kbContext)
            ? "unsupported_home_remedy_in_response"
            : null;
      if (!answer || qualityError) {
        console.error("[chat:provider] Groq answer failed safety checks after retry", {
          model: GROQ_MODEL,
          reason: qualityError || "empty_model_response",
          latency_ms: latencyMs,
        });
        return {
          success: false,
          error_category: qualityError || "empty_model_response",
          text: null,
          latency_ms: latencyMs,
        };
      }
    }

    console.info("[chat:provider] Groq request succeeded", {
      model: GROQ_MODEL,
      latency_ms: latencyMs,
      finish_reason: finishReason,
      response_chars: answer.length,
      safety_retry: safetyRetry,
    });

    return {
      success: true,
      text: answer,
      latency_ms: latencyMs,
      model: GROQ_MODEL,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    let category = "network_or_api_error";
    const status = err?.status || err?.statusCode;

    if (status === 401) {
      category = "invalid_api_key";
    } else if (status === 429) {
      category = "rate_limited";
    } else if (status === 400 || status === 404) {
      category = "model_or_request_error";
    } else if (err?.name === "TimeoutError" || err?.message?.toLowerCase().includes("timeout")) {
      category = "timeout";
    }

    let safeMessage = String(err?.message || err).replace(apiKey, "[REDACTED]");
    safeMessage = safeMessage.replace(/(authorization\s*[:=]\s*bearer\s+)[^\s,;]+/gi, "$1[REDACTED]");
    safeMessage = safeMessage.replace(/\bgsk_[A-Za-z0-9_-]+\b/g, "[REDACTED]");
    if (userQuery) {
      safeMessage = safeMessage.split(userQuery).join("[USER_QUERY_REDACTED]");
    }
    if (kbContext) {
      safeMessage = safeMessage.split(kbContext).join("[KNOWLEDGE_CONTEXT_REDACTED]");
    }
    console.error("[chat:provider] Groq API request failed", {
      category,
      status: status || null,
      error_name: err?.name || "Error",
      message: safeMessage,
    });

    return {
      success: false,
      error_category: category,
      text: null,
      latency_ms: latencyMs,
    };
  }
}

export function buildKbContext(kbResults: ScoredKbResult[]): string {
  if (!kbResults || kbResults.length === 0) {
    return "No relevant veterinary information found in the knowledge base.";
  }
  const parts: string[] = [];
  kbResults.slice(0, 3).forEach((item, i) => {
    parts.push(
      `Entry ${i + 1} (urgency: ${item.urgency || "general"}):\n` +
      `Related symptoms in this entry: ${(item.symptoms || []).join(", ") || "Not specified"}\n` +
      `Guidance: ${item.general_guidance || ""}\n` +
      `Red flags: ${(item.red_flags || []).join(", ") || "None listed"}\n` +
      `Limitations: ${item.limitations || "Not specified"}\n` +
      `Source: ${item.source_name || "Unknown"}`
    );
  });
  return parts.join("\n\n");
}

export function buildFallbackResponse(
  userQuery: string,
  kbResults: ScoredKbResult[],
  animal: string | null = null,
  languageMode = "hindi"
): string {
  const isRj = languageMode === "rajasthani";

  if (hasReducedMilkIntent(userQuery)) {
    if (isRj) {
      return (
        "दूध घटणै के कई कारण हो सकै हैं; ए अकेली बात आपातकाल कोनी है। " +
        "चारा-पाणी, हाल में ब्याणो, गर्मी या तनाव पर ध्यान देवो। " +
        "थण गरम, सूज्यो या दुखै, दूध में खून/गांठ हो, बुखार आवै या दुहते दर्द हो " +
        "तो पशु डॉक्टर सूँ जल्द जाँच करवावो।\n\n" +
        "दूध कद सूँ कम है? हाल में ब्याई है? थण या दूध में कोई बदलाव, बुखार तो कोनी?\n\n" +
        "ई बीमारी रो पक्को निदान कोनी। बिना पशु डॉक्टर री सलाह दवाई मत देवो।"
      );
    }
    return (
      "दूध कम होने के कई कारण हो सकते हैं; केवल दूध घटना अपने-आप में आपातस्थिति नहीं है। " +
      "चारा-पानी, हाल में ब्याने और गर्मी या तनाव पर ध्यान दें। " +
      "थन गर्म, सूजा या दर्दनाक हो, दूध में खून/गांठें हों, बुखार हो या दुहते समय दर्द हो " +
      "तो जल्द पशु चिकित्सक से जाँच करवाएँ।\n\n" +
      "दूध कब से कम है? क्या गाय हाल में ब्याई है? थन या दूध में बदलाव अथवा बुखार तो नहीं?\n\n" +
      "यह पक्का निदान नहीं है। पशु चिकित्सक की सलाह के बिना दवा न दें।"
    );
  }

  if (!kbResults || kbResults.length === 0) {
    if (isRj) {
      return (
        "**पक्की जानकारी नहीं मिली।**\n\nइण सवाल पर भरोसेमंद जानकारी म्हारे ज्ञान आधार में " +
        "नहीं मिली। पशु री हालत बिगड़ै तो तुरन्त पशु डॉक्टर नै संपर्क करो। " +
        "बिना डॉक्टर री सलाह दवाई या घरेलू नुस्खो मत दो।"
      );
    }
    return (
      "**भरोसेमंद जानकारी नहीं मिली।**\n\nइस सवाल के लिए हमारे ज्ञान आधार में पर्याप्त " +
      "जानकारी नहीं मिली। पशु की हालत बिगड़ रही हो तो तुरंत पशु चिकित्सक से संपर्क करें। " +
      "बिना सलाह दवा या घरेलू नुस्खा न दें।"
    );
  }

  const top = kbResults[0];
  const source = top.source_name || "स्रोत का नाम उपलब्ध नहीं";
  const urgency = top.urgency || "general";

  let guidance = "";
  let limitationText = "";
  let finalLine = "";

  if (isRj) {
    if (urgency === "emergency") {
      guidance = "ई हालत गंभीर हो सकै है। अभी पशु डॉक्टर नै फोन करो या नजदीकी पशु चिकित्सा केंद्र ले जावो। पशु नै शांत राखो; घरेलू नुस्खो या दवाई मत आजमावो।";
    } else if (urgency === "prompt") {
      guidance = "पशु नै साफ पाणी उपलब्ध करवावो, आराम करावो और लक्षण कद सूँ शुरू हुआ, खाणो-पिणो कैसो है ई नोट करो। हालत बिगड़ै, लक्षण बने रहै या साँस में दिक्कत होवै तो पशु डॉक्टर सूँ जाँच करवावो। बिना सलाह दवाई मत देवो।";
    } else {
      guidance = "पशु नै साफ पाणी उपलब्ध करवावो, आराम करावो और लक्षणों पर ध्यान राखो। लक्षण बने रहै या बिगड़ै तो पशु डॉक्टर सूँ सलाह लो। बिना सलाह दवाई मत देवो।";
    }
    limitationText = "ई जानकारी बीमारी रो पक्को निदान कोनी है।";
    finalLine = urgency === "emergency"
      ? "ई आपातकाल हो सकै है—मदद लेण में देर मत करो।"
      : "ई सामान्य जानकारी है, पक्को निदान कोनी।";
  } else {
    if (urgency === "emergency") {
      guidance = "यह स्थिति गंभीर हो सकती है। अभी पशु चिकित्सक से संपर्क करें या नज़दीकी पशु चिकित्सा केंद्र जाएँ। पशु को शांत रखें; घरेलू नुस्खे या दवा न आज़माएँ।";
    } else if (urgency === "prompt") {
      guidance = "पशु को साफ पानी उपलब्ध रखें और आराम करने दें। लक्षण कब शुरू हुए और खाना-पानी कैसा है, यह नोट करें। हालत बिगड़े, लक्षण बने रहें या साँस लेने में परेशानी हो तो पशु चिकित्सक से जाँच करवाएँ। बिना सलाह दवा न दें।";
    } else {
      guidance = "पशु को साफ पानी उपलब्ध रखें और आराम करने दें। लक्षणों पर नज़र रखें; वे बने रहें या बिगड़ें तो पशु चिकित्सक से सलाह लें। बिना सलाह दवा न दें।";
    }
    limitationText = "यह जानकारी बीमारी का पक्का निदान नहीं है।";
    finalLine = urgency === "emergency"
      ? "यह आपातस्थिति हो सकती है—मदद लेने में देर न करें।"
      : "यह सामान्य जानकारी है, पक्का निदान नहीं।";
  }

  const analysis = isRj
    ? "बताए लक्षणों के कई कारण हो सकै हैं; इण जानकारी सूँ पक्को निदान कोनी हो सकै।"
    : "इन लक्षणों के कई कारण हो सकते हैं; सिर्फ इस जानकारी से बीमारी का पक्का निदान नहीं हो सकता।";
  const followUp = urgency === "prompt"
    ? isRj
      ? "\n\n**और बतावो:** लक्षण कद सूँ हैं? पशु खा-पी रह्यो है?"
      : "\n\n**और बताइए:** लक्षण कब से हैं? पशु खाना-पानी कर रहा है?"
    : "";

  return `**क्या हो सकता है:**\n${analysis}\n\n**अभी क्या करें:**\n${guidance}${followUp}\n\n**स्रोत:** ${source}\n\n**सीमा:** ${limitationText}\n\n${finalLine}`;
}

export function safetyFilterResponse(text: string): string {
  const riskyTerms = [
    "mg/kg", "ml per", "dose of", "inject", "antibiotic", "एमोक्सिसिलिन",
    "oxytetracycline", "dexamethasone", "penicillin",
  ];
  if (riskyTerms.some((term) => text.toLowerCase().includes(term))) {
    return text + "\n\n⚠️ दवाओं की खुराक के बारे में केवल पशु चिकित्सक से पूछें।";
  }
  return text;
}

export function buildCannotDetermine(kbResults: ScoredKbResult[]): string {
  return kbResults && kbResults.length > 0
    ? "PashuMitra AI सटीक बीमारी, आवश्यक दवाई/खुराक या छिपे हुए लक्षण निर्धारित नहीं कर सकता।"
    : "इस प्रश्न के लिए ज्ञान आधार में पर्याप्त जानकारी नहीं मिली; बीमारी या उपचार का अनुमान नहीं लगाया जा सकता।";
}

export function getVetAdvice(urgency: string, languageMode = "hindi"): string {
  if (languageMode === "rajasthani") {
    if (urgency === "emergency") return "अभी तुरन्त पशु डॉक्टर नै संपर्क करो।";
    if (urgency === "prompt") return "पशु डॉक्टर सूँ जल्द जाँच करवावो।";
    return "लक्षण बने रहें या बिगड़ें तो पशु डॉक्टर सूँ सलाह लो।";
  }
  if (urgency === "emergency") return "अभी तुरंत पशु चिकित्सक से संपर्क करें।";
  if (urgency === "prompt") return "जल्द पशु चिकित्सक से जाँच करवाएँ।";
  return "लक्षण बने रहें या बिगड़ें तो पशु चिकित्सक से सलाह लें।";
}

export function buildEmergencyResponse(
  emergencyResult: EmergencyCheckResult,
  languageMode: string
): string {
  if (languageMode === "rajasthani") {
    return (
      "🚨 **तुरन्त पशु डॉक्टर नै संपर्क करो!** हालत जानलेवा हो सकै है। " +
      "अभी नजदीकी पशु चिकित्सा केंद्र ले जावो। घर पर इलाज या नुस्खो मत आजमावो।"
    );
  }
  return (
    emergencyResult.message_hi ||
    "🚨 **तुरंत पशु चिकित्सक से संपर्क करें।** स्थिति गंभीर हो सकती है। " +
      "अभी नज़दीकी पशु चिकित्सा केंद्र जाएँ और घर पर उपचार न करें।"
  );
}

export async function generateResponse(
  userQuery: string,
  kbResults: ScoredKbResult[],
  animal: string | null = null,
  useLlm = true,
  languageMode = "hindi",
  emergencyResult?: EmergencyCheckResult | null
): Promise<ResponseData> {
  const totalStart = Date.now();

  if (emergencyResult && emergencyResult.is_emergency) {
    return {
      response_text: buildEmergencyResponse(emergencyResult, languageMode),
      response_source: "emergency_rule",
      response_mode: "Emergency rule",
      response_path: "emergency rule",
      response_path_reason: "emergency_rule_matched",
      kb_urgency: "emergency",
      llm_used: false,
      llm_error_category: "not_attempted_emergency",
      llm_latency_ms: 0,
      total_latency_ms: Date.now() - totalStart,
      kb_results_count: 0,
      sources: [],
      limitations: [],
      cannot_determine: null,
      when_to_see_vet: getVetAdvice("emergency", languageMode),
      groq_model: null,
    };
  }

  const context = buildKbContext(kbResults);
  let llmResult: {
    success: boolean;
    error_category?: string;
    text?: string | null;
    latency_ms: number;
    model?: string;
  } = {
    success: false,
    error_category: "not_attempted",
    latency_ms: 0,
  };

  if (useLlm) {
    llmResult = await callGroq(userQuery, context, languageMode);
  } else {
    llmResult.error_category = "not_attempted_disabled";
  }

  let responseText = "";
  let responseSource = "";

  if (llmResult.success && llmResult.text) {
    responseText = safetyFilterResponse(llmResult.text);
    responseSource = kbResults.length > 0 ? "llm_grounded" : "llm_general";
  } else if (useLlm && kbResults.length === 0) {
    const responseRejected = llmResult.error_category?.startsWith("unsupported_") ||
      llmResult.error_category === "truncated_model_response";
    responseText = languageMode === "rajasthani"
      ? responseRejected
        ? "⚠️ AI उत्तर सुरक्षा जाँच में पास कोनी हुयो, इण कारण जवाब रोक दियो। थोड़ी देर बाद फेर कोशिश करो।"
        : "⚠️ AI सेवा अभी उपलब्ध कोनी, ए कारण इण सवाल रो सुरक्षित जवाब तैयार कोनी हो पायो। थोड़ी देर बाद फेर कोशिश करो।"
      : responseRejected
        ? "⚠️ AI उत्तर सुरक्षा जाँच में पास नहीं हुआ, इसलिए जवाब रोक दिया गया। कृपया थोड़ी देर बाद फिर कोशिश करें।"
        : "⚠️ AI उत्तर सेवा अभी उपलब्ध नहीं है, इसलिए इस सवाल का सुरक्षित जवाब नहीं बन पाया। कृपया थोड़ी देर बाद फिर कोशिश करें।";
    responseSource = "provider_error";
  } else {
    responseText = buildFallbackResponse(userQuery, kbResults, animal, languageMode);
    responseSource = "kb_fallback";
    if (useLlm) {
      const responseRejected = llmResult.error_category?.startsWith("unsupported_") ||
        llmResult.error_category === "truncated_model_response";
      const providerNotice = languageMode === "rajasthani"
        ? responseRejected
          ? "⚠️ AI उत्तर सुरक्षा जाँच में पास कोनी हुयो; नीचे सीमित ऑफलाइन जानकारी है।\n\n"
          : "⚠️ AI सेवा अभी उपलब्ध कोनी; नीचे सीमित ऑफलाइन जानकारी है।\n\n"
        : responseRejected
          ? "⚠️ AI उत्तर सुरक्षा जाँच में पास नहीं हुआ; नीचे सीमित ऑफलाइन जानकारी है।\n\n"
          : "⚠️ AI सेवा अभी उपलब्ध नहीं है; नीचे सीमित ऑफलाइन जानकारी है।\n\n";
      responseText = providerNotice + responseText;
    }
  }

  const kbUrgency = getHighestUrgency(kbResults);
  const groqSucceeded = Boolean(llmResult.success && llmResult.text);

  let responsePath = "";
  let responsePathReason = "";

  if (groqSucceeded) {
    responsePath = "Groq API";
    responsePathReason = "request_succeeded";
  } else {
    responsePath = useLlm && kbResults.length === 0 ? "provider error" : "offline fallback";
    responsePathReason = llmResult.error_category || "not_attempted";
  }

  return {
    response_text: responseText,
    response_source: responseSource,
    response_mode: responseSource === "provider_error"
      ? "Provider unavailable"
      : groqSucceeded
        ? "Groq API"
        : "Offline fallback",
    response_path: responsePath,
    response_path_reason: responsePathReason,
    kb_urgency: kbUrgency,
    llm_used: groqSucceeded,
    llm_error_category: llmResult.error_category || null,
    llm_latency_ms: llmResult.latency_ms || 0,
    total_latency_ms: Date.now() - totalStart,
    kb_results_count: kbResults.length,
    sources: kbResults.map((r) => ({
      name: r.source_name || "",
      url: r.source_url || "",
      verified: r.last_verified || "",
      id: r.id || "",
    })),
    limitations: [],
    cannot_determine: kbResults.length > 0 ? buildCannotDetermine(kbResults) : null,
    when_to_see_vet: getVetAdvice(kbUrgency, languageMode),
    groq_model: groqSucceeded ? GROQ_MODEL : null,
  };
}

export function needsClarification(
  userQuery: string,
  animal: string | null,
  kbResults: ScoredKbResult[],
  languageMode = "hindi"
): { needs_clarification: boolean; question_hi?: string; question?: string | null } {
  if (!animal) {
    if (languageMode === "rajasthani") {
      return {
        needs_clarification: true,
        question_hi: "कुणसो पशु बीमार है—गाय, भैंस, बकरी या भेड़?",
      };
    }
    return {
      needs_clarification: true,
      question_hi: "कौन सा पशु बीमार है—गाय, भैंस, बकरी या भेड़?",
    };
  }

  if (animal && kbResults && kbResults.length > 0) {
    return { needs_clarification: false, question: null };
  }

  if (hasReducedMilkIntent(userQuery)) {
    if (languageMode === "rajasthani") {
      return {
        needs_clarification: true,
        question_hi: "दूध कद सूँ कम है? हाल में ब्याई है? चारा-पाणी ठीक है, थण में सूजन या दर्द तो कोनी?",
      };
    }
    return {
      needs_clarification: true,
      question_hi: "दूध कब से कम है? गाय हाल में ब्याई है? चारा-पानी ठीक है, थन में सूजन या दर्द तो नहीं?",
    };
  }

  if (!kbResults || kbResults.length === 0) {
    if (languageMode === "rajasthani") {
      return {
        needs_clarification: true,
        question_hi: "पशु में और के लक्षण हैं? के वो खा-पी रह्यो है?",
      };
    }
    return {
      needs_clarification: true,
      question_hi: "पशु में और क्या लक्षण हैं? क्या वह खाना-पीना कर रहा है?",
    };
  }

  return { needs_clarification: false, question: null };
}
