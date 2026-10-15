import {
  EmergencyCheckResult,
  PrescriptionCheckResult,
  UrgencyDisplay,
  UrgencyLevel,
} from "../types.js";

export const EMERGENCY_KEYWORDS = [
  // Collapse / inability to stand
  "गिर गई", "गिर गया", "गिर गयी", "गिर गयो",
  "उठ नहीं", "उठ नई", "खड़ा नहीं", "खड़ी नहीं", "खड़ो नई",
  "उठ नहीं पा", "बेहोश", "बेसुध",
  "collapse", "collapsed", "down", "cannot stand", "unable to stand",
  "gir gai", "gir gayi", "gir gyi", "gir gaya", "gir gya",
  "uth nahi pa rahi", "uth nahi pa raha", "khadi nahi ho pa rahi",
  "khaDa nahi ho pa raha", "behosh", "besudh",
  // Breathing emergency
  "साँस नहीं", "साँस रुक", "मुँह खोलकर साँस",
  "सांस नहीं ले पा", "सांस लेने में परेशानी", "साँस लेने में परेशानी",
  "सांस लेने में तकलीफ", "साँस लेने में तकलीफ", "सांस लेने में दिक्कत",
  "साँस लेने में दिक्कत", "घुट रहा", "दम घुट",
  "open mouth breathing", "gasping", "dyspnea",
  "saans nahi aa rahi", "saans nahi le pa rahi", "saans lene me dikkat",
  "saans lene mein dikkat", "muh khol ke saans", "munh khol ke saans",
  // Poisoning
  "ज़हर", "ज़हरीला", "ज़हरीलो", "कीटनाशक खा", "pesticide",
  "poison", "toxic", "तड़प", "झाग आ",
  "zeher", "zahar", "jahar", "zehreela", "zaharila",
  "convulsion", "दौरे", "मिर्गी जैसा",
  // Severe bloat
  "बहुत ज़्यादा फूला", "बहुत फूला", "ढोल जैसा पेट", "शीघ्र फूल गया",
  "severe bloat", "extreme bloat", "pet bahut phool", "bahut pet phool",
  "pet dhol jaisa",
  // Difficult birth
  "बच्चा नहीं निकल", "बच्चा अटक", "प्रसव में अटक",
  "dystocia", "difficult birth", "stuck kid", "stuck calf",
  "bachcha atak", "baccha atak", "bachcha nahi nikal", "delivery me atak",
  "labor for hours", "labour for hours", "prasav me atak",
  // Bleeding
  "बहुत खून", "अत्यधिक खून", "खून रुक नहीं", "रक्तस्राव",
  "heavy bleeding", "uncontrolled bleeding",
  // Milk fever / metabolic emergency
  "ब्याने के बाद गिरी", "ब्याने के बाद उठ नहीं",
  "milk fever", "hypocalcaemia",
];

export const PRESCRIPTION_KEYWORDS = [
  "amoxicillin", "एमोक्सिसिलिन", "ऑक्सीटेट्रासाइक्लिन", "oxytetracycline",
  "dexamethasone", "डेक्सामेथासोन", "antibiotic", "एंटीबायोटिक",
  "injection dose", "इंजेक्शन कितना", "कितनी खुराक", "dose", "dosage",
  "खुराक", "दवाई कितनी", "prescription", "penicillin", "पेनिसिलिन",
  "metronidazole", "मेट्रोनिडाज़ोल", "steroid", "स्टेरॉयड",
];

export const DANGEROUS_ADVICE_KEYWORDS = [
  "चाकू से काटो", "घाव काटो", "शल्य", "operation at home",
  "कांच की बोतल", "गर्म लोहा", "branding", "काट देना",
];

export const URGENCY_EMERGENCY: UrgencyLevel = "emergency";
export const URGENCY_PROMPT: UrgencyLevel = "prompt";
export const URGENCY_GENERAL: UrgencyLevel = "general";

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsEmergencyKeyword(text: string, keyword: string): boolean {
  const textLower = text.toLowerCase();
  const kwLower = keyword.toLowerCase();

  if (kwLower === "down") {
    const milkYieldDown = /\b(?:milk|doodh|dudh|dud|yield|production)\b(?:\s+[a-z]+){0,3}\s+down\b/i.test(textLower);
    const animalDown = /\b(?:cow|cattle|buffalo|animal|livestock|gaay|gai|bhains)\b(?:\s+[a-z]+){0,2}\s+down\b/i.test(textLower);
    if (milkYieldDown && !animalDown) {
      return false;
    }
  }

  if (/[a-z]/i.test(kwLower)) {
    const regex = new RegExp(`(?<![a-z])${escapeRegex(kwLower)}(?![a-z])`, "i");
    return regex.test(textLower);
  }

  return textLower.includes(kwLower);
}

export function checkEmergency(text: string): EmergencyCheckResult {
  const matched: string[] = [];

  for (const kw of EMERGENCY_KEYWORDS) {
    if (containsEmergencyKeyword(text, kw)) {
      matched.push(kw);
    }
  }

  if (matched.length > 0) {
    return {
      is_emergency: true,
      matched_keywords: matched,
      urgency: URGENCY_EMERGENCY,
      message_hi: (
        "🚨 **तुरंत पशु चिकित्सक से संपर्क करें!**\n\n" +
        "आपके पशु की स्थिति गंभीर लग रही है। " +
        "कृपया अभी अपने नज़दीकी पशु चिकित्सक या " +
        "पशु चिकित्सा केंद्र पर जाएं। " +
        "घर पर उपचार करने की कोशिश न करें — " +
        "इससे पशु की जान को खतरा हो सकता है।\n\n" +
        "**हेल्पलाइन:** अपने ज़िले का पशु चिकित्सा केंद्र नंबर डायल करें।"
      ),
      message_en: (
        "🚨 EMERGENCY: Please contact a veterinarian IMMEDIATELY. " +
        "The described condition may be life-threatening. " +
        "Do not attempt home treatment. Go to the nearest " +
        "veterinary clinic/hospital now."
      ),
    };
  }

  return {
    is_emergency: false,
    matched_keywords: [],
    urgency: null,
    message_hi: null,
    message_en: null,
  };
}

export function checkPrescriptionRequest(text: string): PrescriptionCheckResult {
  const textLower = text.toLowerCase();
  const matched: string[] = [];

  for (const kw of PRESCRIPTION_KEYWORDS) {
    if (textLower.includes(kw.toLowerCase())) {
      matched.push(kw);
    }
  }

  if (matched.length > 0) {
    return {
      is_prescription_request: true,
      matched_keywords: matched,
      message_hi: (
        "⚠️ **PashuMitra AI दवाओं की खुराक नहीं बता सकता।**\n\n" +
        "एंटीबायोटिक और अन्य दवाइयों की खुराक सिर्फ एक लाइसेंसशुदा " +
        "पशु चिकित्सक ही बता सकते हैं। गलत दवा या गलत खुराक से " +
        "पशु की जान जा सकती है और दूध असुरक्षित हो सकता है।\n\n" +
        "कृपया अपने नज़दीकी **Pashu Chikitsa Kendra** पर जाएं।"
      ),
    };
  }

  return {
    is_prescription_request: false,
    matched_keywords: [],
    message_hi: null,
  };
}

export function getUrgencyFromKeywords(
  text: string,
  kbUrgency?: UrgencyLevel | null
): UrgencyLevel {
  const emergencyCheck = checkEmergency(text);
  if (emergencyCheck.is_emergency) {
    return URGENCY_EMERGENCY;
  }

  if (kbUrgency) {
    return kbUrgency;
  }

  return URGENCY_GENERAL;
}

export function getUrgencyDisplay(urgency: UrgencyLevel): UrgencyDisplay {
  if (urgency === URGENCY_EMERGENCY) {
    return {
      label: "🚨 आपातकाल (Emergency)",
      label_en: "🚨 EMERGENCY",
      color: "#FF0000",
      bg_color: "#FFE8E8",
      border_color: "#FF0000",
      advice_hi: "तुरंत पशु चिकित्सक से मिलें",
      advice_en: "Seek immediate veterinary care",
    };
  } else if (urgency === URGENCY_PROMPT) {
    return {
      label: "⚠️ जल्द डॉक्टर दिखाएं",
      label_en: "⚠️ PROMPT VETERINARY CARE",
      color: "#FF8C00",
      bg_color: "#FFF3E0",
      border_color: "#FF8C00",
      advice_hi: "जल्द से जल्द पशु चिकित्सक से परामर्श लें",
      advice_en: "Arrange professional veterinary assessment soon",
    };
  } else {
    return {
      label: "ℹ️ सामान्य जानकारी",
      label_en: "ℹ️ GENERAL GUIDANCE",
      color: "#2E7D32",
      bg_color: "#E8F5E9",
      border_color: "#2E7D32",
      advice_hi: "पशु पर नज़र रखें और यदि स्थिति बिगड़े तो डॉक्टर से मिलें",
      advice_en: "Monitor the animal and consult a vet if condition worsens",
    };
  }
}
