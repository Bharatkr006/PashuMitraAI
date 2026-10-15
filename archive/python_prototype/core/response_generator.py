"""
PashuMitra AI response generation.
Uses Groq when configured and an explicitly localized safe fallback otherwise.
"""
import os
import logging
import re
import time
from pathlib import Path
from dotenv import load_dotenv
from core.dialect_normalizer import has_reduced_milk_intent

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env", override=False)
GROQ_MODEL = "openai/gpt-oss-20b"
GROQ_TIMEOUT_SECONDS = 15.0
logger = logging.getLogger(__name__)


def is_groq_key_configured() -> bool:
    """Return only a boolean; never expose the API key."""
    load_dotenv(PROJECT_ROOT / ".env", override=False)
    key = os.getenv("GROQ_API_KEY", "").strip()
    return bool(key and key != "your_groq_api_key_here")


def _system_prompt(language_mode: str) -> str:
    if language_mode == "rajasthani":
        language_instruction = (
            "Reply in simple, respectful Rajasthani-friendly conversational language. "
            "Use commonly understood regional expressions where reliable. Do not claim perfect "
            "dialect fluency; if uncertain, use clear simple Hindi, never default to English."
        )
        final_line = "ई सामान्य जानकारी है; पशु डॉक्टर सूँ सलाह ज़रूर लो।"
    else:
        language_instruction = (
            "Reply in simple, natural Hindi written in Devanagari, suitable for rural livestock "
            "owners. Do not answer in English except for necessary source names or technical terms."
        )
        final_line = "यह सिर्फ सामान्य जानकारी है। कृपया पशु चिकित्सक से ज़रूर मिलें।"

    return f"""You are PashuMitra AI, a cautious veterinary information assistant for rural livestock owners in India.

LANGUAGE REQUIREMENT: {language_instruction}

STRICT RULES:
1. Use only information explicitly supported by the supplied veterinary knowledge context.
2. If the context is missing or insufficient, say reliable information was not found; do not guess.
3. Do not diagnose definitively from a short text description.
4. Never prescribe drugs, antibiotics, or medication dosages.
5. Never recommend invasive procedures or risky home remedies.
6. Recommend a qualified veterinarian for serious, persistent, or worsening symptoms.
7. Keep the answer short, clear, and practical.
8. Do not fabricate sources, phone numbers, clinical facts, or citations.
9. End with: "{final_line}"
10. If important details are missing, ask one or two short follow-up questions in the selected language.
11. For reduced milk yield, ask about duration, feed and water intake, recent calving, stress/heat,
    and udder or milk changes. Recommend prompt veterinary examination for fever, a hot/swollen/painful
    udder, blood or clots in milk, or pain during milking. Do not call reduced milk yield alone an emergency.

Use localized headings where possible: what the report may mean (not a diagnosis), safe next step, and when to contact a veterinarian.
"""


def _call_groq(user_query: str, kb_context: str, language_mode: str = "hindi") -> dict:
    """Call Groq API and return status without exposing credentials or raw exceptions."""
    try:
        from groq import Groq
    except ImportError:
        logger.warning("Groq skipped: groq_package_missing")
        return {"success": False, "error_category": "groq_package_missing",
                "text": None, "latency_ms": 0}

    load_dotenv(PROJECT_ROOT / ".env", override=False)
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key or api_key == "your_groq_api_key_here":
        logger.warning("Groq skipped: missing_api_key")
        return {"success": False, "error_category": "missing_api_key",
                "text": None, "latency_ms": 0}

    messages = [
        {"role": "system", "content": _system_prompt(language_mode)},
        {"role": "user", "content": (
            f"Selected response language: {language_mode}\n"
            f"VETERINARY KNOWLEDGE CONTEXT:\n{kb_context}\n"
            f"USER QUESTION:\n{user_query}\n"
            "Answer in the selected language. If the context does not support an answer, say so."
        )},
    ]
    start = time.time()
    try:
        client = Groq(
            api_key=api_key,
            timeout=GROQ_TIMEOUT_SECONDS,
            max_retries=0,
        )
        response = client.chat.completions.create(
            model=GROQ_MODEL, messages=messages, max_tokens=500, temperature=0.2
        )
        answer = (response.choices[0].message.content or "").strip()
        if not answer:
            logger.warning("Groq request returned an empty response")
            return {"success": False, "error_category": "empty_model_response",
                    "text": None, "latency_ms": round((time.time()-start)*1000, 2)}
        return {"success": True, "text": answer,
                "latency_ms": round((time.time()-start)*1000, 2), "model": GROQ_MODEL}
    except Exception as exc:
        status_code = getattr(exc, "status_code", None)
        if status_code == 401:
            category = "invalid_api_key"
        elif status_code == 429:
            category = "rate_limited"
        elif status_code in (400, 404):
            category = "model_or_request_error"
        elif isinstance(exc, TimeoutError) or "timeout" in type(exc).__name__.lower():
            category = "timeout"
        else:
            category = "network_or_api_error"
        safe_message = str(exc).replace(api_key, "[REDACTED]")
        safe_message = re.sub(r"(?i)(authorization\s*[:=]\s*bearer\s+)[^\s,;]+",
                              r"\1[REDACTED]", safe_message)
        safe_message = re.sub(r"\bgsk_[A-Za-z0-9_-]+\b", "[REDACTED]", safe_message)
        safe_message = " ".join(safe_message.split())[:500]
        logger.error("Groq API request failed (%s, status=%s): %s",
                     type(exc).__name__, status_code or "unknown", safe_message)
        return {"success": False, "error_category": category, "text": None,
                "latency_ms": round((time.time()-start)*1000, 2)}


def _build_kb_context(kb_results: list) -> str:
    if not kb_results:
        return "No relevant veterinary information found in the knowledge base."
    parts = []
    for i, item in enumerate(kb_results[:3], 1):
        parts.append(
            f"Entry {i} (urgency: {item.get('urgency', 'general')}):\n"
            f"Guidance: {item.get('general_guidance', '')}\n"
            f"Red flags: {', '.join(item.get('red_flags', [])) or 'None listed'}\n"
            f"Limitations: {item.get('limitations', 'Not specified')}\n"
            f"Source: {item.get('source_name', 'Unknown')}"
        )
    return "\n\n".join(parts)


def _build_fallback_response(user_query: str, kb_results: list,
                             animal: str | None, language_mode: str = "hindi") -> str:
    """Safe localized fallback; avoids repeating unreviewed English clinical advice."""
    is_rj = language_mode == "rajasthani"
    if has_reduced_milk_intent(user_query):
        if is_rj:
            return (
                "दूध घटणै के कई कारण हो सकै हैं; ए अकेली बात आपातकाल कोनी है। "
                "चारा-पाणी, हाल में ब्याणो, गर्मी या तनाव पर ध्यान देवो। "
                "थण गरम, सूज्यो या दुखै, दूध में खून/गांठ हो, बुखार आवै या दुहते दर्द हो "
                "तो पशु डॉक्टर सूँ जल्द जाँच करवावो।\n\n"
                "दूध कद सूँ कम है? हाल में ब्याई है? थण या दूध में कोई बदलाव, बुखार तो कोनी?\n\n"
                "ई बीमारी रो पक्को निदान कोनी। बिना पशु डॉक्टर री सलाह दवाई मत देवो।"
            )
        return (
            "दूध कम होने के कई कारण हो सकते हैं; केवल दूध घटना अपने-आप में आपातस्थिति नहीं है। "
            "चारा-पानी, हाल में ब्याने और गर्मी या तनाव पर ध्यान दें। "
            "थन गर्म, सूजा या दर्दनाक हो, दूध में खून/गांठें हों, बुखार हो या दुहते समय दर्द हो "
            "तो जल्द पशु चिकित्सक से जाँच करवाएँ।\n\n"
            "दूध कब से कम है? क्या गाय हाल में ब्याई है? थन या दूध में बदलाव अथवा बुखार तो नहीं?\n\n"
            "यह पक्का निदान नहीं है। पशु चिकित्सक की सलाह के बिना दवा न दें।"
        )

    if not kb_results:
        if is_rj:
            return ("**पक्की जानकारी नहीं मिली।**\n\nइण सवाल पर भरोसेमंद जानकारी म्हारे ज्ञान आधार में "
                    "नहीं मिली। पशु री हालत बिगड़ै तो तुरन्त पशु डॉक्टर नै संपर्क करो। "
                    "बिना डॉक्टर री सलाह दवाई या घरेलू नुस्खो मत दो।")
        return ("**भरोसेमंद जानकारी नहीं मिली।**\n\nइस सवाल के लिए हमारे ज्ञान आधार में पर्याप्त "
                "जानकारी नहीं मिली। पशु की हालत बिगड़ रही हो तो तुरंत पशु चिकित्सक से संपर्क करें। "
                "बिना सलाह दवा या घरेलू नुस्खा न दें。".replace("。", "।"))

    top = kb_results[0]
    source = top.get("source_name", "स्रोत का नाम उपलब्ध नहीं")
    urgency = top.get("urgency", "general")
    limitations = top.get("limitations", "")

    if is_rj:
        if urgency == "emergency":
            guidance = "ई हालत गंभीर हो सकै है। अभी पशु डॉक्टर नै फोन करो या नजदीकी पशु चिकित्सा केंद्र ले जावो। घरेलू नुस्खो मत आजमावो।"
        elif urgency == "prompt":
            guidance = "पशु री जाँच पशु डॉक्टर सूँ जल्द करवावो। हालत बिगड़ै या साँस में दिक्कत होवै तो तुरन्त मदद लो।"
        else:
            guidance = "पशु पर ध्यान राखो। लक्षण बने रहें या बिगड़ें तो पशु डॉक्टर सूँ सलाह लो। बिना सलाह दवाई मत दो।"
        limitation_text = "ई जानकारी बीमारी रो पक्को निदान कोनी है।"
        final_line = "ई सामान्य जानकारी है; पशु डॉक्टर सूँ सलाह ज़रूर लो।"
    else:
        if urgency == "emergency":
            guidance = "यह स्थिति गंभीर हो सकती है। अभी पशु चिकित्सक से संपर्क करें या नज़दीकी पशु चिकित्सा केंद्र जाएँ। घरेलू नुस्खे न आज़माएँ।"
        elif urgency == "prompt":
            guidance = "पशु की जाँच जल्द पशु चिकित्सक से करवाएँ। हालत बिगड़ने या साँस लेने में परेशानी होने पर तुरंत मदद लें।"
        else:
            guidance = "पशु पर नज़र रखें। लक्षण बने रहें या बिगड़ें तो पशु चिकित्सक से सलाह लें। बिना सलाह दवा न दें।"
        limitation_text = "यह जानकारी बीमारी का पक्का निदान नहीं है।"
        final_line = "यह सिर्फ सामान्य जानकारी है। कृपया पशु चिकित्सक से ज़रूर मिलें।"

    result = f"**अभी क्या करें:**\n{guidance}\n\n**स्रोत:** {source}\n\n**सीमा:** {limitation_text}\n\n{final_line}"
    # Do not insert the dataset's possibly English limitations into localized fallback.
    return result


def _safety_filter_response(text: str) -> str:
    risky_terms = [
        "mg/kg", "ml per", "dose of", "inject", "antibiotic", "एमोक्सिसिलिन",
        "oxytetracycline", "dexamethasone", "penicillin",
    ]
    if any(term in text.lower() for term in risky_terms):
        text += "\n\n⚠️ दवाओं की खुराक के बारे में केवल पशु चिकित्सक से पूछें।"
    return text


def _build_cannot_determine(kb_results: list) -> str:
    return (
        "PashuMitra AI सटीक बीमारी, आवश्यक दवाई/खुराक या छिपे हुए लक्षण निर्धारित नहीं कर सकता।"
        if kb_results else
        "इस प्रश्न के लिए ज्ञान आधार में पर्याप्त जानकारी नहीं मिली; बीमारी या उपचार का अनुमान नहीं लगाया जा सकता।"
    )


def _get_vet_advice(urgency: str, language_mode: str = "hindi") -> str:
    if language_mode == "rajasthani":
        if urgency == "emergency":
            return "अभी तुरन्त पशु डॉक्टर नै संपर्क करो।"
        if urgency == "prompt":
            return "पशु डॉक्टर सूँ जल्द जाँच करवावो।"
        return "लक्षण बने रहें या बिगड़ें तो पशु डॉक्टर सूँ सलाह लो।"
    if urgency == "emergency":
        return "अभी तुरंत पशु चिकित्सक से संपर्क करें।"
    if urgency == "prompt":
        return "जल्द पशु चिकित्सक से जाँच करवाएँ।"
    return "लक्षण बने रहें या बिगड़ें तो पशु चिकित्सक से सलाह लें।"


def _build_emergency_response(emergency_result: dict, language_mode: str) -> str:
    if language_mode == "rajasthani":
        return (
            "🚨 **तुरन्त पशु डॉक्टर नै संपर्क करो!** हालत जानलेवा हो सकै है। "
            "अभी नजदीकी पशु चिकित्सा केंद्र ले जावो। घर पर इलाज या नुस्खो मत आजमावो।"
        )
    return emergency_result.get("message_hi") or (
        "🚨 **तुरंत पशु चिकित्सक से संपर्क करें।** स्थिति गंभीर हो सकती है। "
        "अभी नज़दीकी पशु चिकित्सा केंद्र जाएँ और घर पर उपचार न करें।"
    )


def generate_response(user_query: str, kb_results: list, animal: str | None = None,
                      use_llm: bool = True, language_mode: str = "hindi",
                      emergency_result: dict | None = None) -> dict:
    total_start = time.time()
    if emergency_result and emergency_result.get("is_emergency"):
        logger.warning(
            "Groq skipped: emergency_rule_matched (%s)",
            ", ".join(emergency_result.get("matched_keywords", [])) or "matched condition",
        )
        return {
            "response_text": _build_emergency_response(emergency_result, language_mode),
            "response_source": "emergency_rule",
            "response_mode": "Emergency rule",
            "response_path": "emergency rule",
            "response_path_reason": "emergency_rule_matched",
            "kb_urgency": "emergency",
            "llm_used": False,
            "llm_error_category": "not_attempted_emergency",
            "llm_latency_ms": 0,
            "total_latency_ms": round((time.time() - total_start) * 1000, 2),
            "kb_results_count": 0,
            "sources": [],
            "limitations": [],
            "cannot_determine": None,
            "when_to_see_vet": _get_vet_advice("emergency", language_mode),
            "groq_model": None,
        }

    context = _build_kb_context(kb_results)
    llm_result = {"success": False, "error_category": "not_attempted", "latency_ms": 0}
    if use_llm:
        llm_result = _call_groq(user_query, context, language_mode)
    else:
        llm_result["error_category"] = "not_attempted_disabled"
        logger.warning("Groq skipped: use_llm_disabled")

    if llm_result.get("success") and llm_result.get("text"):
        response_text = _safety_filter_response(llm_result["text"])
        response_source = "llm_grounded"
    else:
        response_text = _build_fallback_response(user_query, kb_results, animal, language_mode)
        response_source = "kb_fallback"

    from core.knowledge_retrieval import get_highest_urgency
    kb_urgency = get_highest_urgency(kb_results)
    groq_succeeded = bool(llm_result.get("success") and llm_result.get("text"))
    if groq_succeeded:
        response_path = "Groq API"
        response_path_reason = "request_succeeded"
    else:
        response_path = "offline fallback"
        response_path_reason = llm_result.get("error_category", "not_attempted")
        if use_llm:
            logger.warning("Groq unavailable; using offline fallback (%s)",
                           response_path_reason)

    return {
        "response_text": response_text,
        "response_source": response_source,
        "response_mode": "Groq API" if groq_succeeded else "Offline fallback",
        "response_path": response_path,
        "response_path_reason": response_path_reason,
        "kb_urgency": kb_urgency,
        "llm_used": groq_succeeded,
        "llm_error_category": llm_result.get("error_category"),
        "llm_latency_ms": llm_result.get("latency_ms", 0),
        "total_latency_ms": round((time.time() - total_start) * 1000, 2),
        "kb_results_count": len(kb_results),
        "sources": [
            {"name": r.get("source_name", ""), "url": r.get("source_url", ""),
             "verified": r.get("last_verified", ""), "id": r.get("id", "")}
            for r in kb_results
        ],
        "limitations": [],
        "cannot_determine": _build_cannot_determine(kb_results),
        "when_to_see_vet": _get_vet_advice(kb_urgency, language_mode),
        "groq_model": GROQ_MODEL if llm_result.get("success") else None,
    }


def needs_clarification(user_query: str, animal: str | None, kb_results: list,
                        language_mode: str = "hindi") -> dict:
    if not animal:
        if language_mode == "rajasthani":
            return {"needs_clarification": True,
                    "question_hi": "कुणसो पशु बीमार है—गाय, भैंस, बकरी या भेड़?",
                    "question_en": ""}
        return {"needs_clarification": True,
                "question_hi": "कौन सा पशु बीमार है—गाय, भैंस, बकरी या भेड़?",
                "question_en": ""}
    if animal and kb_results:
        return {"needs_clarification": False, "question": None}
    if has_reduced_milk_intent(user_query):
        if language_mode == "rajasthani":
            return {
                "needs_clarification": True,
                "question_hi": "दूध कद सूँ कम है? हाल में ब्याई है? चारा-पाणी ठीक है, थण में सूजन या दर्द तो कोनी?",
                "question_en": "",
            }
        return {
            "needs_clarification": True,
            "question_hi": "दूध कब से कम है? गाय हाल में ब्याई है? चारा-पानी ठीक है, थन में सूजन या दर्द तो नहीं?",
            "question_en": "",
        }
    if not kb_results:
        if language_mode == "rajasthani":
            return {"needs_clarification": True,
                    "question_hi": "पशु में और के लक्षण हैं? के वो खा-पी रह्यो है?",
                    "question_en": ""}
        return {"needs_clarification": True,
                "question_hi": "पशु में और क्या लक्षण हैं? क्या वह खाना-पीना कर रहा है?",
                "question_en": ""}
    return {"needs_clarification": False, "question": None}
