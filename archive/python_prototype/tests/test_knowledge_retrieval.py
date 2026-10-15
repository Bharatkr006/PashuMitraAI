"""
test_knowledge_retrieval.py — PashuMitra AI Tests
--------------------------------------------------
Tests for the veterinary knowledge base retrieval system.
"""

import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from core.knowledge_retrieval import (
    retrieve,
    load_knowledge_base,
    get_highest_urgency,
    format_sources,
    tokenize,
)


class TestKnowledgeBaseLoading:
    """Tests that the KB loads correctly."""

    def test_kb_loads_successfully(self):
        kb = load_knowledge_base()
        assert isinstance(kb, list)
        assert len(kb) > 0

    def test_kb_has_minimum_entries(self):
        kb = load_knowledge_base()
        assert len(kb) >= 15, "KB must have at least 15 entries"

    def test_all_entries_have_required_fields(self):
        kb = load_knowledge_base()
        required = ["id", "species", "urgency", "general_guidance", "source_name", "source_url"]
        for entry in kb:
            for field in required:
                assert field in entry, f"Entry {entry.get('id','?')} missing field: {field}"

    def test_no_empty_source_urls(self):
        """Every KB entry must have a non-empty source URL."""
        kb = load_knowledge_base()
        for entry in kb:
            assert entry.get("source_url", ""), \
                f"Entry {entry.get('id','?')} has empty source_url"

    def test_urgency_values_valid(self):
        """All urgency values must be in the allowed set."""
        kb = load_knowledge_base()
        valid_urgency = {"emergency", "prompt", "general"}
        for entry in kb:
            assert entry.get("urgency") in valid_urgency, \
                f"Entry {entry.get('id','?')} has invalid urgency: {entry.get('urgency')}"


class TestRetrieval:
    """Tests for the retrieve() function."""

    def test_bloat_query_finds_bloat_entry(self):
        """Query about bloat/अफारा should find bloat KB entry."""
        result = retrieve("भैंस का पेट फूला हुआ है अफारा", top_k=3)
        assert result["source_found"] is True
        ids = [r["id"] for r in result["results"]]
        assert "CB002" in ids, f"Bloat entry CB002 not found. Got: {ids}"

    def test_appetite_loss_finds_entry(self):
        result = retrieve("गाय खाना नहीं खा रही है", top_k=3)
        assert result["source_found"] is True

    def test_diarrhea_goat_finds_entry(self):
        result = retrieve("बकरी को दस्त हो रहे हैं", species="goat", top_k=3)
        assert result["source_found"] is True

    def test_rajasthani_bloat_word_finds_entry(self):
        """Rajasthani 'आफरो' should match bloat entry."""
        result = retrieve("आफरो आयो भैंस को", top_k=3)
        assert result["source_found"] is True

    @pytest.mark.parametrize("query", [
        "hao koi bat ko ni meri gaay dudh km de rhi se",
        "गाय का दूध कम हो गया है",
        "म्हारी गाय दूध घट गयो",
        "My cow's milk production is down",
    ])
    def test_reduced_milk_queries_find_prompt_entry_without_emergencies(self, query):
        result = retrieve(query, species="cattle", top_k=3, min_score=0.5)
        ids = [entry["id"] for entry in result["results"]]
        assert "CB005" in ids
        assert all(entry["urgency"] != "emergency" for entry in result["results"])

    def test_vaccination_query_finds_entry(self):
        result = retrieve("टीका कब लगवाएं", top_k=3)
        assert result["source_found"] is True
        ids = [r["id"] for r in result["results"]]
        assert "GEN002" in ids, f"Vaccination entry GEN002 not found. Got: {ids}"

    def test_poisoning_query_finds_entry(self):
        result = retrieve("जानवर ने ज़हरीला खाया", top_k=3)
        assert result["source_found"] is True

    def test_unrelated_query_returns_low_score_or_empty(self):
        """A completely unrelated query should score low."""
        result = retrieve("कल मौसम कैसा रहेगा", top_k=3, min_score=2.0)
        # Should not return highly relevant KB results
        for r in result["results"]:
            assert r["score"] < 10, "Unrelated query got suspiciously high score"

    def test_retrieval_has_timing_info(self):
        result = retrieve("गाय बीमार है")
        assert "retrieval_time_ms" in result
        assert result["retrieval_time_ms"] >= 0

    def test_kb_size_reported(self):
        result = retrieve("बकरी")
        assert result["kb_size"] > 0

    def test_species_filter_works(self):
        """Cattle-specific filter should not return goat-only entries."""
        result = retrieve("दस्त", species="cattle", top_k=5)
        for r in result["results"]:
            species = r.get("species", [])
            assert "cattle" in species or "buffalo" in species or "all" in species, \
                f"Entry {r['id']} returned for cattle but species is {species}"

    def test_sources_have_names(self):
        result = retrieve("गाय को बुखार है", top_k=3)
        for r in result["results"]:
            assert r.get("source_name"), f"Entry {r['id']} has no source_name"


class TestUrgencyFromResults:
    """Tests for urgency aggregation."""

    def test_emergency_entry_returns_emergency(self):
        """Bloat entry is marked emergency — should be returned as such."""
        result = retrieve("पेट फूला", top_k=3)
        # If CB002 (emergency) is in results
        for r in result["results"]:
            if r["id"] == "CB002":
                urgency = get_highest_urgency(result["results"])
                assert urgency == "emergency"
                break

    def test_general_entries_return_general_or_prompt(self):
        result = retrieve("टीका", top_k=3)
        urgency = get_highest_urgency(result["results"])
        assert urgency in ["general", "prompt"]

    def test_empty_results_return_general(self):
        urgency = get_highest_urgency([])
        assert urgency == "general"


class TestFormatSources:
    """Tests for source formatting."""

    def test_empty_results_returns_not_found_message(self):
        output = format_sources([])
        assert "नहीं" in output or "No source" in output

    def test_results_with_source_formatted(self):
        mock_results = [{
            "source_name": "ICAR Test",
            "source_url": "https://icar.org.in",
            "last_verified": "2024-01-15",
        }]
        output = format_sources(mock_results)
        assert "ICAR Test" in output
        assert "icar.org.in" in output
