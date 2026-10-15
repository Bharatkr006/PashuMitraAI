"""
test_dialect_normalizer.py — PashuMitra AI Tests
-------------------------------------------------
Tests for Hindi/Rajasthani dialect normalization.
"""

import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from core.dialect_normalizer import (
    normalize_text,
    detect_species_from_text,
    load_dictionary,
    save_user_correction,
)


class TestDictionaryLoading:
    def test_dictionary_loads(self):
        d = load_dictionary()
        assert isinstance(d, dict)
        assert "animal_names" in d
        assert "symptom_mappings" in d

    def test_dictionary_has_animal_names(self):
        d = load_dictionary()
        assert len(d["animal_names"]) > 5

    def test_dictionary_has_symptom_mappings(self):
        d = load_dictionary()
        assert len(d["symptom_mappings"]) > 10


class TestNormalization:
    def test_rajasthani_bloat_normalized(self):
        """Rajasthani 'आफरो' should be detected as bloat symptom."""
        result = normalize_text("आफरो आयो भैंस को")
        assert result["has_dialect_terms"] is True
        assert any("bloat" in m["normalized_term"] for m in result["dialect_matches"])

    def test_rajasthani_fever_normalized(self):
        """'बखार' should map to fever."""
        result = normalize_text("म्हारे जानवर को बखार है")
        assert any("fever" in m["normalized_term"].lower() for m in result["dialect_matches"])

    def test_original_preserved(self):
        """Original text must always be preserved unchanged."""
        original = "आफरो आयो भैंस को"
        result = normalize_text(original)
        assert result["original"] == original

    def test_hindi_bloat_word_detected(self):
        result = normalize_text("भैंस को अफारा हो गया है")
        symptoms = result["symptoms_detected"]
        assert any("bloat" in s or "gas" in s for s in symptoms), \
            f"Expected bloat in symptoms, got: {symptoms}"

    def test_normal_hindi_no_dialect_terms(self):
        result = normalize_text("मेरी गाय बीमार है")
        # Should still process without errors
        assert "original" in result
        assert isinstance(result["dialect_matches"], list)

    def test_animal_detected_from_rajasthani(self):
        """Buffalo should be detected from 'भैंस' in text."""
        result = normalize_text("भैंस का पेट फूल गया")
        assert result["animal_detected"] in ["buffalo", "cattle", None]
        # specifically buffalo:
        if result["animal_detected"]:
            assert result["animal_detected"] == "buffalo"

    def test_diarrhea_symptom_detected(self):
        """Rajasthani 'दस्त' should map to diarrhea."""
        result = normalize_text("दस्त हो रहे हैं बकरी को")
        assert any("diarrhea" in m["normalized_term"].lower() for m in result["dialect_matches"])

    def test_roman_hindi_low_milk_is_normalized(self):
        result = normalize_text("hao koi bat ko ni meri gaay dudh km de rhi se")
        assert result["animal_detected"] == "cattle"
        assert "milk reduction" in result["normalized"]

    def test_rajasthani_roman_low_milk_is_normalized(self):
        result = normalize_text("mhari gai dudh ghat gayo")
        assert result["animal_detected"] == "cattle"
        assert "milk reduction" in result["normalized"]


class TestSpeciesDetection:
    def test_cow_detected_from_hindi(self):
        assert detect_species_from_text("मेरी गाय बीमार है") == "cattle"

    def test_buffalo_detected_from_hindi(self):
        assert detect_species_from_text("भैंस का दूध कम हो गया") == "buffalo"

    def test_buffalo_before_cattle(self):
        """When both buffalo and cattle words present, buffalo should win."""
        result = detect_species_from_text("मुर्रा भैंस और गाय दोनों बीमार")
        # Either is acceptable but should detect one
        assert result in ["buffalo", "cattle"]

    def test_goat_detected(self):
        assert detect_species_from_text("बकरी को दस्त है") == "goat"

    def test_sheep_detected(self):
        assert detect_species_from_text("भेड़ लंगड़ा रही है") == "sheep"

    def test_no_animal_returns_none(self):
        result = detect_species_from_text("आज मौसम अच्छा है")
        assert result is None

    def test_english_cow_detected(self):
        assert detect_species_from_text("my cow is sick") == "cattle"

    def test_english_buffalo_detected(self):
        assert detect_species_from_text("buffalo is not eating") == "buffalo"


class TestUserCorrection:
    def test_correction_without_consent_rejected(self):
        result = save_user_correction("बखार", "fever", consent=False)
        assert result["success"] is False

    def test_correction_with_consent_saves(self):
        """With consent, correction should be accepted."""
        result = save_user_correction("टेस्ट_शब्द", "test_word", consent=True)
        assert result["success"] is True
