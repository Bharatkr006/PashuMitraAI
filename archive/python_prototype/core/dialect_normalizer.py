"""
dialect_normalizer.py — PashuMitra AI
--------------------------------------
Translates Hindi and Rajasthani regional terms to
standardized English/Hindi equivalents for KB matching.

Satisfies: Requirement B (Hindi and Rajasthani dialect awareness)
           Innovation 5 (Regional vocabulary learning)

Design principles:
- Transparent dictionary-based approach (NOT ML-based currently)
- Preserves original user input alongside normalized version
- Extensible: new terms added to dialect_dictionary.json
- Does NOT claim perfect Rajasthani speech recognition
"""

import json
import os
import re
from pathlib import Path



# Path to the dialect dictionary
DICT_PATH = Path(__file__).parent.parent / "data" / "dialect_dictionary.json"


def load_dictionary() -> dict:
    """Load the dialect dictionary from JSON file."""
    try:
        with open(DICT_PATH, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {"animal_names": {}, "symptom_mappings": {}, "common_phrases": {}}
    except json.JSONDecodeError as e:
        print(f"Warning: Could not parse dialect_dictionary.json: {e}")
        return {"animal_names": {}, "symptom_mappings": {}, "common_phrases": {}}


def normalize_text(text: str, dictionary: dict | None = None) -> dict:
    """
    Normalize dialect input text to standard terms.
    
    Returns:
        dict with:
          - original: the unchanged user input
          - normalized: text after dialect substitution
          - animal_detected: detected animal species (or None)
          - symptoms_detected: list of normalized symptoms found
          - dialect_matches: list of {original_term, normalized_term} replacements made
    """
    if dictionary is None:
        dictionary = load_dictionary()

    original = text
    normalized = text
    dialect_matches = []
    symptoms_detected = []
    animal_detected = None

    # ── Step 1: Check for whole-phrase mappings first (longest match wins) ──
    common_phrases = dictionary.get("common_phrases", {})
    for phrase, translation in sorted(common_phrases.items(), key=lambda x: -len(x[0])):
        if phrase.lower() in text.lower():
            dialect_matches.append({
                "original_term": phrase,
                "normalized_term": translation,
                "type": "phrase"
            })
            # Don't replace for normalization — just record the match

    # ── Step 2: Animal name detection ──
    animal_names = dictionary.get("animal_names", {})
    for term, animal_en in sorted(animal_names.items(), key=lambda x: -len(x[0])):
        if term.lower() in text.lower():
            if animal_detected is None:  # Take the first/longest match
                animal_detected = _normalize_species(animal_en)
            dialect_matches.append({
                "original_term": term,
                "normalized_term": animal_en,
                "type": "animal"
            })
    if animal_detected is None:
        animal_detected = detect_species_from_text(text)

    # Add a stable concept for common Roman Hindi/Rajasthani milk-yield phrases.
    if has_reduced_milk_intent(text):
        normalized = f"{normalized} milk reduction low milk production"
        symptoms_detected.append("milk reduction")
        dialect_matches.append({
            "original_term": text,
            "normalized_term": "reduced milk production",
            "type": "symptom"
        })

    # ── Step 3: Symptom mappings ──
    symptom_mappings = dictionary.get("symptom_mappings", {})
    for term, symptom_en in sorted(symptom_mappings.items(), key=lambda x: -len(x[0])):
        if term.lower() in normalized.lower():
            symptoms_detected.append(symptom_en)
            normalized = re.sub(
                re.escape(term),
                f"{term}({symptom_en})",
                normalized,
                flags=re.IGNORECASE
            )
            dialect_matches.append({
                "original_term": term,
                "normalized_term": symptom_en,
                "type": "symptom"
            })

    # ── Step 4: Remove duplicate symptoms ──
    symptoms_detected = list(dict.fromkeys(symptoms_detected))  # preserve order, unique

    return {
        "original": original,
        "normalized": normalized,
        "animal_detected": animal_detected,
        "symptoms_detected": symptoms_detected,
        "dialect_matches": dialect_matches,
        "has_dialect_terms": len(dialect_matches) > 0,
    }


def _normalize_species(animal_en: str) -> str:
    """Map various animal descriptions to standard species names."""
    animal_lower = animal_en.lower()
    if "cow" in animal_lower or "calf" in animal_lower or "cattle" in animal_lower:
        return "cattle"
    elif "buffalo" in animal_lower:
        return "buffalo"
    elif "goat" in animal_lower:
        return "goat"
    elif "sheep" in animal_lower or "lamb" in animal_lower:
        return "sheep"
    return animal_en


def has_reduced_milk_intent(text: str) -> bool:
    """Recognize reduced milk yield in Hindi, Roman Hindi, Rajasthani, and English."""
    text_lower = text.lower()
    milk_term = re.search(
        r"(?:दूध|दुध|दूघ|दूधिया|\b(?:doodh|dudh|dud|milk)\b)", text_lower
    )
    reduced_term = re.search(
        r"(?:कम|घट|घट्यो|घट गयो|घट गया|घट गई|कम हो|कम दे|कम आवे|"
        r"\b(?:kam|km|kum|ghat|ghatyo|ghato|ghatya|low|less|reduce|reduced|"
        r"decrease|decreased|decline|drop|dropped|down)\b)",
        text_lower,
    )
    return bool(milk_term and reduced_term)


def detect_species_from_text(text: str) -> str | None:
    """
    Quick species detection from raw Hindi/Rajasthani/English text.
    Returns standardized species name or None.
    """
    text_lower = text.lower()

    # Check common Hindi/Rajasthani words
    cattle_words = ["गाय", "गइया", "गैया", "बछड़", "cow", "cattle", "गाय का",
                    "राठी", "गिर", "gaay", "gai", "gaye"]
    buffalo_words = ["भैंस", "भैंसा", "पाड़", "buffalo", "murrah", "मुर्रा", "bhains"]
    goat_words = ["बकरी", "बकरा", "मेमना", "goat", "kid", "bakri", "bakra"]
    sheep_words = ["भेड़", "भेड़ा", "sheep", "lamb", "नाली", "बाड़मेरी", "bhed"]

    for word in buffalo_words:  # Buffalo before cattle (both contain similar words)
        if _contains_species_word(text_lower, word):
            return "buffalo"
    for word in cattle_words:
        if _contains_species_word(text_lower, word):
            return "cattle"
    for word in goat_words:
        if _contains_species_word(text_lower, word):
            return "goat"
    for word in sheep_words:
        if _contains_species_word(text_lower, word):
            return "sheep"

    return None


def _contains_species_word(text: str, word: str) -> bool:
    if re.search(r"[a-z]", word):
        return re.search(rf"(?<![a-z]){re.escape(word)}(?![a-z])", text) is not None
    return word in text


def save_user_correction(original_term: str, corrected_term: str, consent: bool = False):
    """
    Save a user-submitted vocabulary correction to the dictionary.
    Only saves with explicit user consent.
    This does NOT train any AI model — it's a dictionary update.
    """
    if not consent:
        return {"success": False, "reason": "User consent not given"}

    try:
        with open(DICT_PATH, encoding="utf-8") as f:
            data = json.load(f)

        correction = {
            "original": original_term,
            "corrected": corrected_term,
            "submitted_anonymously": True,
            "note": "User correction — requires manual review before adding to main dictionary"
        }

        if "corrections_contributed" not in data:
            data["corrections_contributed"] = []

        data["corrections_contributed"].append(correction)

        with open(DICT_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        return {"success": True, "message": "Correction saved for review. Thank you!"}

    except Exception as e:
        return {"success": False, "reason": str(e)}
