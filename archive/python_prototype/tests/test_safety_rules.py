"""
test_safety_rules.py — PashuMitra AI Tests
-------------------------------------------
Tests for emergency detection and safety rules.
All tests must pass before claiming safety features work.
"""

import pytest
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.safety_rules import (
    check_emergency,
    check_prescription_request,
    get_urgency_from_keywords,
    get_urgency_display,
    URGENCY_EMERGENCY,
    URGENCY_PROMPT,
    URGENCY_GENERAL,
)


class TestEmergencyDetection:
    """Tests for check_emergency() function."""

    def test_hindi_collapse_triggers_emergency(self):
        """गिर गया (collapsed) must trigger emergency."""
        result = check_emergency("मेरी गाय गिर गई है")
        assert result["is_emergency"] is True
        assert result["urgency"] == URGENCY_EMERGENCY

    def test_rajasthani_collapse_triggers_emergency(self):
        """Rajasthani 'गिर गयो' must trigger emergency."""
        result = check_emergency("भैंस गिर गयो खड़ो नई थ्यो")
        assert result["is_emergency"] is True

    def test_cannot_stand_triggers_emergency(self):
        result = check_emergency("गाय खड़ी नहीं हो पा रही")
        assert result["is_emergency"] is True

    def test_poisoning_triggers_emergency(self):
        """Suspected poisoning always emergency."""
        result = check_emergency("जानवर ने कुछ ज़हरीला खा लिया तड़प रहा है")
        assert result["is_emergency"] is True

    def test_difficult_birth_triggers_emergency(self):
        """Dystocia is always emergency."""
        result = check_emergency("बकरी का बच्चा नहीं निकल रहा, घंटे से कोशिश कर रही है")
        assert result["is_emergency"] is True

    def test_bloat_strong_wording_triggers_emergency(self):
        """Severe bloat described strongly should trigger emergency."""
        result = check_emergency("भैंस का पेट बहुत ज़्यादा फूला हुआ है")
        assert result["is_emergency"] is True

    def test_open_mouth_breathing_triggers_emergency(self):
        """Open mouth breathing = respiratory emergency."""
        result = check_emergency("जानवर मुँह खोलकर साँस ले रहा है")
        assert result["is_emergency"] is True

    def test_normal_appetite_loss_no_emergency(self):
        """Simple appetite loss without emergency keywords = not emergency."""
        result = check_emergency("मेरी गाय खाना नहीं खा रही है")
        assert result["is_emergency"] is False

    def test_normal_diarrhea_no_emergency(self):
        """Simple diarrhea query = not emergency."""
        result = check_emergency("बकरी को दस्त हो रहे हैं")
        assert result["is_emergency"] is False

    def test_low_milk_alone_is_not_emergency(self):
        result = check_emergency("hao koi bat ko ni meri gaay dudh km de rhi se")
        assert result["is_emergency"] is False

    def test_milk_yield_down_is_not_an_emergency(self):
        result = check_emergency("My cow's milk production is down")
        assert result["is_emergency"] is False
        assert check_emergency("cow down and milk production is low")["is_emergency"] is True

    def test_roman_hindi_collapse_is_emergency(self):
        result = check_emergency("meri gai gir gai hai aur uth nahi pa rahi")
        assert result["is_emergency"] is True

    def test_roman_hindi_breathing_difficulty_is_emergency(self):
        result = check_emergency("meri gai saans nahi le pa rahi")
        assert result["is_emergency"] is True

    def test_vaccination_question_no_emergency(self):
        """General vaccine question = not emergency."""
        result = check_emergency("पशु को कौन सा टीका लगवाना चाहिए")
        assert result["is_emergency"] is False

    def test_emergency_message_hi_present(self):
        """Emergency response must include Hindi message."""
        result = check_emergency("गाय गिर गई है")
        assert result["message_hi"] is not None
        assert len(result["message_hi"]) > 10

    def test_matched_keywords_returned(self):
        """Matched keywords should be returned for transparency."""
        result = check_emergency("जानवर ने ज़हर खा लिया")
        assert len(result["matched_keywords"]) > 0

    def test_empty_string_no_emergency(self):
        """Empty string should not trigger emergency."""
        result = check_emergency("")
        assert result["is_emergency"] is False

    def test_english_collapse_triggers_emergency(self):
        """English emergency terms should also work."""
        result = check_emergency("The cow has collapsed and cannot stand")
        assert result["is_emergency"] is True


class TestPrescriptionDetection:
    """Tests for prescription drug request detection."""

    def test_antibiotic_dosage_detected(self):
        result = check_prescription_request("एमोक्सिसिलिन कितनी देनी चाहिए")
        assert result["is_prescription_request"] is True

    def test_english_antibiotic_detected(self):
        result = check_prescription_request("How much amoxicillin to give my cow")
        assert result["is_prescription_request"] is True

    def test_safe_message_provided(self):
        result = check_prescription_request("oxytetracycline dose for buffalo")
        assert result["message_hi"] is not None
        assert "पशु चिकित्सक" in result["message_hi"]

    def test_normal_query_not_prescription(self):
        result = check_prescription_request("मेरी गाय खाना नहीं खा रही")
        assert result["is_prescription_request"] is False

    def test_vaccination_not_prescription(self):
        result = check_prescription_request("टीका कब लगवाएं")
        assert result["is_prescription_request"] is False


class TestUrgencyLogic:
    """Tests that emergency keywords always override KB urgency."""

    def test_emergency_overrides_general_kb(self):
        """Emergency keywords must override any KB urgency level."""
        urgency = get_urgency_from_keywords(
            text="गाय गिर गई है",
            kb_urgency=URGENCY_GENERAL,
        )
        assert urgency == URGENCY_EMERGENCY

    def test_emergency_overrides_prompt_kb(self):
        urgency = get_urgency_from_keywords(
            text="जानवर ने ज़हर खाया",
            kb_urgency=URGENCY_PROMPT,
        )
        assert urgency == URGENCY_EMERGENCY

    def test_kb_urgency_used_when_no_emergency(self):
        """KB urgency level is used when no emergency keywords detected."""
        urgency = get_urgency_from_keywords(
            text="गाय खाना कम खा रही है",
            kb_urgency=URGENCY_PROMPT,
        )
        assert urgency == URGENCY_PROMPT

    def test_general_when_nothing(self):
        """Default to general when no keywords and no KB urgency."""
        urgency = get_urgency_from_keywords(
            text="गाय अच्छी है",
            kb_urgency=None,
        )
        assert urgency == URGENCY_GENERAL


class TestUrgencyDisplay:
    """Tests for urgency display metadata."""

    def test_emergency_display_has_red_color(self):
        disp = get_urgency_display(URGENCY_EMERGENCY)
        assert "#FF" in disp["color"].upper() or "red" in disp["color"].lower()

    def test_all_urgency_levels_have_labels(self):
        for level in [URGENCY_EMERGENCY, URGENCY_PROMPT, URGENCY_GENERAL]:
            disp = get_urgency_display(level)
            assert "label" in disp
            assert "advice_hi" in disp
            assert len(disp["label"]) > 3
