"""
safety_rules.py — PashuMitra AI
-------------------------------
Emergency and safety detection using ONLY rule-based logic.
This module NEVER depends on an LLM. Emergency detection must be
deterministic and cannot be overridden by any AI model.

Satisfies: Requirement D (Safety and Emergency Handling)
           Innovation 1 (Pashu Health Triage)
"""

import re

# ─────────────────────────────────────────────
# EMERGENCY KEYWORDS — Hindi + Rajasthani + English
# These trigger the highest-priority alert level.
# ─────────────────────────────────────────────
EMERGENCY_KEYWORDS = [
    # Collapse / inability to stand
    "गिर गई", "गिर गया", "गिर गयी", "गिर गयो",
    "उठ नहीं", "उठ नई", "खड़ा नहीं", "खड़ी नहीं", "खड़ो नई",
    "उठ नहीं पा", "बेहोश", "बेसुध",
    "collapse", "collapsed", "down", "cannot stand", "unable to stand",
    "gir gai", "gir gayi", "gir gyi", "gir gaya", "gir gya",
    "uth nahi pa rahi", "uth nahi pa raha", "khadi nahi ho pa rahi",
    "khaDa nahi ho pa raha", "behosh", "besudh",
    # Breathing emergency
    "साँस नहीं", "साँस रुक", "मुँह खोलकर साँस",
    "सांस नहीं ले पा", "घुट रहा", "दम घुट",
    "open mouth breathing", "gasping", "dyspnea",
    "saans nahi aa rahi", "saans nahi le pa rahi", "saans lene me dikkat",
    "saans lene mein dikkat", "muh khol ke saans", "munh khol ke saans",
    # Poisoning
    "ज़हर", "ज़हरीला", "ज़हरीलो", "कीटनाशक खा", "pesticide",
    "poison", "toxic", "तड़प", "झाग आ",
    "zeher", "zahar", "jahar", "zehreela", "zaharila",
    "convulsion", "दौरे", "मिर्गी जैसा",
    # Severe bloat
    "बहुत ज़्यादा फूला", "बहुत फूला", "ढोल जैसा पेट", "शीघ्र फूल गया",
    "severe bloat", "extreme bloat", "pet bahut phool", "bahut pet phool",
    "pet dhol jaisa",
    # Difficult birth
    "बच्चा नहीं निकल", "बच्चा अटक", "प्रसव में अटक",
    "dystocia", "difficult birth", "stuck kid", "stuck calf",
    "bachcha atak", "baccha atak", "bachcha nahi nikal", "delivery me atak",
    "labor for hours", "labour for hours", "prasav me atak",
    # Bleeding
    "बहुत खून", "अत्यधिक खून", "खून रुक नहीं", "रक्तस्राव",
    "heavy bleeding", "uncontrolled bleeding",
    # Milk fever / metabolic emergency
    "ब्याने के बाद गिरी", "ब्याने के बाद उठ नहीं",
    "milk fever", "hypocalcaemia",
]

# ─────────────────────────────────────────────
# DRUG/PRESCRIPTION KEYWORDS — refuse safely
# ─────────────────────────────────────────────
PRESCRIPTION_KEYWORDS = [
    "amoxicillin", "एमोक्सिसिलिन", "ऑक्सीटेट्रासाइक्लिन", "oxytetracycline",
    "dexamethasone", "डेक्सामेथासोन", "antibiotic", "एंटीबायोटिक",
    "injection dose", "इंजेक्शन कितना", "कितनी खुराक", "dose", "dosage",
    "खुराक", "दवाई कितनी", "prescription", "penicillin", "पेनिसिलिन",
    "metronidazole", "मेट्रोनिडाज़ोल", "steroid", "स्टेरॉयड",
]

# ─────────────────────────────────────────────
# INVASIVE / DANGEROUS HOME REMEDY KEYWORDS
# ─────────────────────────────────────────────
DANGEROUS_ADVICE_KEYWORDS = [
    "चाकू से काटो", "घाव काटो", "शल्य", "operation at home",
    "कांच की बोतल", "गर्म लोहा", "branding", "काट देना",
]

# Urgency levels
URGENCY_EMERGENCY = "emergency"
URGENCY_PROMPT = "prompt"
URGENCY_GENERAL = "general"


def check_emergency(text: str) -> dict:
    """
    Check if text contains emergency keywords.
    Returns a dict with:
      - is_emergency: bool
      - matched_keywords: list of matched terms
      - message_hi: Hindi emergency message
    
    This function is deterministic. No LLM is involved.
    """
    text_lower = text.lower()
    matched = []

    for kw in EMERGENCY_KEYWORDS:
        if _contains_emergency_keyword(text_lower, kw):
            matched.append(kw)

    if matched:
        return {
            "is_emergency": True,
            "matched_keywords": matched,
            "urgency": URGENCY_EMERGENCY,
            "message_hi": (
                "🚨 **तुरंत पशु चिकित्सक से संपर्क करें!**\n\n"
                "आपके पशु की स्थिति गंभीर लग रही है। "
                "कृपया अभी अपने नज़दीकी पशु चिकित्सक या "
                "पशु चिकित्सा केंद्र पर जाएं। "
                "घर पर उपचार करने की कोशिश न करें — "
                "इससे पशु की जान को खतरा हो सकता है।\n\n"
                "**हेल्पलाइन:** अपने ज़िले का पशु चिकित्सा केंद्र नंबर डायल करें।"
            ),
            "message_en": (
                "🚨 EMERGENCY: Please contact a veterinarian IMMEDIATELY. "
                "The described condition may be life-threatening. "
                "Do not attempt home treatment. Go to the nearest "
                "veterinary clinic/hospital now."
            ),
        }

    return {
        "is_emergency": False,
        "matched_keywords": [],
        "urgency": None,
        "message_hi": None,
        "message_en": None,
    }


def _contains_emergency_keyword(text: str, keyword: str) -> bool:
    if keyword == "down":
        milk_yield_down = re.search(
            r"\b(?:milk|doodh|dudh|dud|yield|production)\b(?:\s+[a-z]+){0,3}\s+down\b",
            text,
        )
        animal_down = re.search(
            r"\b(?:cow|cattle|buffalo|animal|livestock|gaay|gai|bhains)\b"
            r"(?:\s+[a-z]+){0,2}\s+down\b",
            text,
        )
        if milk_yield_down and not animal_down:
            return False
    if re.search(r"[a-z]", keyword, re.IGNORECASE):
        return re.search(
            rf"(?<![a-z]){re.escape(keyword.lower())}(?![a-z])", text
        ) is not None
    return keyword.lower() in text


def check_prescription_request(text: str) -> dict:
    """
    Detect requests for prescription drug doses or dangerous advice.
    Returns whether the query should be declined and a safe response.
    """
    text_lower = text.lower()
    matched = []

    for kw in PRESCRIPTION_KEYWORDS:
        if kw.lower() in text_lower:
            matched.append(kw)

    if matched:
        return {
            "is_prescription_request": True,
            "matched_keywords": matched,
            "message_hi": (
                "⚠️ **PashuMitra AI दवाओं की खुराक नहीं बता सकता।**\n\n"
                "एंटीबायोटिक और अन्य दवाइयों की खुराक सिर्फ एक लाइसेंसशुदा "
                "पशु चिकित्सक ही बता सकते हैं। गलत दवा या गलत खुराक से "
                "पशु की जान जा सकती है और दूध असुरक्षित हो सकता है।\n\n"
                "कृपया अपने नज़दीकी **Pashu Chikitsa Kendra** पर जाएं।"
            ),
        }

    return {
        "is_prescription_request": False,
        "matched_keywords": [],
        "message_hi": None,
    }


def get_urgency_from_keywords(text: str, kb_urgency: str | None = None) -> str:
    """
    Determine the final urgency level.
    Rule: Emergency keywords always win over KB urgency.
    """
    emergency_check = check_emergency(text)
    if emergency_check["is_emergency"]:
        return URGENCY_EMERGENCY

    if kb_urgency:
        return kb_urgency

    return URGENCY_GENERAL


def get_urgency_display(urgency: str) -> dict:
    """
    Return display metadata for each urgency level.
    Used by the UI to show color-coded badges.
    """
    if urgency == URGENCY_EMERGENCY:
        return {
            "label": "🚨 आपातकाल (Emergency)",
            "label_en": "🚨 EMERGENCY",
            "color": "#FF0000",
            "bg_color": "#FFE8E8",
            "border_color": "#FF0000",
            "advice_hi": "तुरंत पशु चिकित्सक से मिलें",
            "advice_en": "Seek immediate veterinary care",
        }
    elif urgency == URGENCY_PROMPT:
        return {
            "label": "⚠️ जल्द डॉक्टर दिखाएं",
            "label_en": "⚠️ PROMPT VETERINARY CARE",
            "color": "#FF8C00",
            "bg_color": "#FFF3E0",
            "border_color": "#FF8C00",
            "advice_hi": "जल्द से जल्द पशु चिकित्सक से परामर्श लें",
            "advice_en": "Arrange professional veterinary assessment soon",
        }
    else:
        return {
            "label": "ℹ️ सामान्य जानकारी",
            "label_en": "ℹ️ GENERAL GUIDANCE",
            "color": "#2E7D32",
            "bg_color": "#E8F5E9",
            "border_color": "#2E7D32",
            "advice_hi": "पशु पर नज़र रखें और यदि स्थिति बिगड़े तो डॉक्टर से मिलें",
            "advice_en": "Monitor the animal and consult a vet if condition worsens",
        }
