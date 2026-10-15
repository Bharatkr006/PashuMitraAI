import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";
import { normalizeText, detectSpeciesFromText } from "../core/dialect-normalizer.js";
import {
  checkEmergency,
  checkPrescriptionRequest,
  getUrgencyFromKeywords,
  URGENCY_EMERGENCY,
} from "../core/safety-rules.js";
import { retrieve, getHighestUrgency } from "../core/knowledge-retrieval.js";
import { generateResponse, needsClarification } from "../core/response-generator.js";
import { recordQuery } from "../core/metrics.js";
import { ResponseData } from "../types.js";

const router = Router();

router.post("/chat", async (req: Request, res: Response) => {
  const requestId = randomUUID();
  let phase = "validation";
  let queryForRedaction = "";
  try {
    const { query, animal: requestedAnimal, languageMode = "hindi", useLlm = true } = req.body;

    if (!query || typeof query !== "string" || !query.trim()) {
      res.status(400).json({ error: "Query is required" });
      return;
    }

    const cleanQuery = query.trim();
    queryForRedaction = cleanQuery;
    console.info("[chat] request received", {
      request_id: requestId,
      query_chars: cleanQuery.length,
      language: languageMode,
      llm_enabled: Boolean(useLlm),
    });

    // Step 1: Safety checks (always first, before any other processing)
    phase = "safety";
    const dialectInfo = normalizeText(cleanQuery);
    const safetyText = `${cleanQuery} ${dialectInfo.normalized}`;
    const emergencyResult = checkEmergency(safetyText);
    const prescriptionResult = checkPrescriptionRequest(cleanQuery);

    // Step 2 & 3: Species detection
    const animal =
      requestedAnimal ||
      dialectInfo.animal_detected ||
      detectSpeciesFromText(cleanQuery) ||
      null;

    // Genuine emergencies bypass retrieval and LLM so safety guidance is immediate
    if (emergencyResult.is_emergency) {
      console.info("[chat] emergency rule matched", {
        request_id: requestId,
        matched_rule_count: emergencyResult.matched_keywords.length,
      });
      const responseData = await generateResponse(
        cleanQuery,
        [],
        animal,
        false,
        languageMode,
        emergencyResult
      );
      responseData.final_urgency = URGENCY_EMERGENCY;
      responseData.emergency_check = emergencyResult;
      responseData.dialect_info = dialectInfo;

      recordQuery(
        false,
        false,
        false,
        true,
        responseData.total_latency_ms,
        0
      );

      res.json(responseData);
      return;
    }

    // Step 4: Prescription request refusal
    if (prescriptionResult.is_prescription_request) {
      const refusalText =
        (languageMode === "rajasthani"
          ? "⚠️ पशु री दवाई री खुराक मैं नहीं बता सकूं। गलत खुराक नुकसान कर सकै है। पशु डॉक्टर सूँ सलाह लो।"
          : prescriptionResult.message_hi) ||
        "⚠️ पशु की दवाई या खुराक के लिए कृपया पशु चिकित्सक से परामर्श करें।";

      recordQuery(false, false, false, false, 0, 0);

      const refusalResponse: ResponseData = {
        response_text: refusalText,
        response_source: "prescription_safety_rule",
        response_mode: "Prescription safety rule",
        response_path: "offline fallback",
        response_path_reason: "prescription_request_safety_rule",
        kb_urgency: "general",
        final_urgency: "general",
        emergency_check: emergencyResult,
        llm_used: false,
        llm_error_category: "not_attempted_prescription_safety_rule",
        llm_latency_ms: 0,
        total_latency_ms: 0,
        kb_results_count: 0,
        sources: [],
        limitations: [
          "दवाइयों और एंटीबायोटिक की खुराक केवल अधिकृत पशु चिकित्सक ही निर्धारित कर सकते हैं।",
        ],
        cannot_determine: null,
        when_to_see_vet: "कृपया अपने नज़दीकी पशु चिकित्सक से मिलें।",
        dialect_info: dialectInfo,
      };

      res.json(refusalResponse);
      return;
    }

    // Step 5: Knowledge retrieval
    phase = "retrieval";
    const retrieval = retrieve(cleanQuery, animal, 3, 0.5);
    const kbResults = retrieval.results;
    const retrievalTime = retrieval.retrieval_time_ms;
    console.info("[chat] retrieval completed", {
      request_id: requestId,
      kb_size: retrieval.kb_size,
      matched_entries: kbResults.map(({ id, score, urgency }) => ({ id, score, urgency })),
      retrieval_ms: retrievalTime,
      retrieval_error: retrieval.error || null,
    });

    // Step 6: Clarification check
    const clarification = needsClarification(cleanQuery, animal, kbResults, languageMode);

    // Step 7: Determine urgency (rule-based keywords always override KB)
    const kbUrgency = getHighestUrgency(kbResults);
    const finalUrgency = getUrgencyFromKeywords(safetyText, kbUrgency);

    // Step 8: Response generation
    phase = "generation";
    const responseData = await generateResponse(
      cleanQuery,
      kbResults,
      animal,
      useLlm,
      languageMode
    );

    responseData.final_urgency = finalUrgency;
    responseData.emergency_check = emergencyResult;
    responseData.dialect_info = dialectInfo;
    console.info("[chat] response generated", {
      request_id: requestId,
      response_source: responseData.response_source,
      response_path: responseData.response_path,
      provider_error: responseData.llm_error_category || null,
      response_chars: responseData.response_text.length,
      total_latency_ms: responseData.total_latency_ms,
    });

    // Step 9: Handle clarification
    let responseText = responseData.response_text;
    if (
      clarification.needs_clarification &&
      kbResults.length === 0 &&
      !responseData.llm_used &&
      responseData.response_source !== "provider_error" &&
      !responseText.includes("?")
    ) {
      responseText += "\n\n" + (clarification.question_hi || "");
      responseData.response_text = responseText;
    }

    // Record metrics
    recordQuery(
      kbResults.length > 0,
      Boolean(responseData.llm_used),
      Boolean(responseData.llm_used),
      emergencyResult.is_emergency,
      responseData.total_latency_ms,
      retrievalTime
    );

    if (responseData.response_source === "provider_error") {
      res.status(503).json(responseData);
      return;
    }
    res.json(responseData);
  } catch (err: any) {
    const safeMessage = String(err?.message || "Unknown error")
      .replace(/\bgsk_[A-Za-z0-9_-]+\b/g, "[REDACTED]")
      .replace(/(authorization\s*[:=]\s*bearer\s+)[^\s,;]+/gi, "$1[REDACTED]");
    const redactedMessage = queryForRedaction
      ? safeMessage.split(queryForRedaction).join("[USER_QUERY_REDACTED]")
      : safeMessage;
    console.error("[chat] request failed", {
      request_id: requestId,
      phase,
      error_name: err?.name || "Error",
      message: redactedMessage,
    });
    res.status(500).json({
      error: "Internal server error",
      error_category: `chat_${phase}_error`,
    });
  }
});

export default router;
