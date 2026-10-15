"""
knowledge_retrieval.py — PashuMitra AI
---------------------------------------
Searches the veterinary knowledge base JSON to find
relevant entries for a user query.

Uses keyword matching + simple TF-IDF scoring.
Works 100% offline after initial setup.

Satisfies: Requirement C (Veterinary knowledge grounding)
           Requirement E (Low-latency, offline capable)
"""

import json
import re
import math
import time
from pathlib import Path
from typing import Optional
from core.dialect_normalizer import normalize_text

KB_PATH = Path(__file__).parent.parent / "data" / "veterinary_knowledge.json"

# Cached KB to avoid repeated disk reads
_kb_cache: list | None = None
_kb_load_time: float = 0.0


def load_knowledge_base(force_reload: bool = False) -> list:
    """Load and cache the veterinary knowledge base."""
    global _kb_cache, _kb_load_time

    if _kb_cache is not None and not force_reload:
        return _kb_cache

    try:
        start = time.time()
        with open(KB_PATH, encoding="utf-8") as f:
            _kb_cache = json.load(f)
        _kb_load_time = time.time() - start
        return _kb_cache
    except FileNotFoundError:
        print(f"ERROR: Knowledge base not found at {KB_PATH}")
        return []
    except json.JSONDecodeError as e:
        print(f"ERROR: Could not parse knowledge base: {e}")
        return []


def tokenize(text: str) -> list[str]:
    """Simple tokenizer: split on whitespace and punctuation."""
    # Keep Devanagari, Latin, and digits
    tokens = re.findall(r'[\u0900-\u097F]+|[a-zA-Z]+|\d+', text.lower())
    return tokens


def score_entry(query_tokens: list[str], entry: dict) -> float:
    """
    Score a KB entry against query tokens.
    Returns a relevance score (higher = more relevant).
    
    Scoring logic (transparent):
    - Exact symptom keyword match: +3.0
    - Hindi keyword match: +2.5
    - Rajasthani keyword match: +2.5
    - General text match in guidance: +0.5 per token
    - Species match: +2.0 bonus
    """
    score = 0.0

    query_set = set(query_tokens)
    query_text = " ".join(query_tokens)
    symptoms = [tokenize(s.lower()) for s in entry.get("symptoms", [])]
    keywords_hi = [tokenize(k.lower()) for k in entry.get("keywords_hi", [])]
    keywords_rj = [tokenize(k.lower()) for k in entry.get("keywords_rj", [])]
    guidance_tokens = set(tokenize(entry.get("general_guidance", "").lower()))
    ambiguous_tokens = {
        "milk", "doodh", "dudh", "dud", "cow", "cattle", "animal",
        "पशु", "गाय", "भैंस", "दूध", "दुध",
    }
    ignored_phrase_tokens = {
        "the", "a", "an", "is", "are", "was", "were", "has", "have", "had",
        "का", "की", "के", "है", "हैं", "था", "थी", "थे", "में", "को", "से",
        "और", "नहीं", "हो", "हुआ", "हुई", "गया", "गई", "गयी", "गयो",
        "रहा", "रही", "रहे", "down",
    }

    def phrase_score(phrase_tokens: list[str], exact_score: float) -> float:
        if not phrase_tokens:
            return 0.0
        if len(phrase_tokens) == 1:
            token = phrase_tokens[0]
            return exact_score if token in query_set and token not in ambiguous_tokens else 0.0
        phrase = " ".join(phrase_tokens)
        if f" {phrase} " in f" {query_text} ":
            return exact_score
        distinctive_tokens = set(phrase_tokens) - ignored_phrase_tokens - ambiguous_tokens
        if query_set.intersection(distinctive_tokens):
            return exact_score / 2
        return 0.0

    for phrase_tokens in symptoms:
        score += phrase_score(phrase_tokens, 3.0)
    for phrase_tokens in keywords_hi + keywords_rj:
        score += phrase_score(phrase_tokens, 2.5)

    # Single generic overlaps in explanatory text (e.g. "milk" in "milk fever")
    # are not enough to return an unrelated, potentially emergency entry.
    guidance_matches = (
        query_set.intersection(guidance_tokens) - ambiguous_tokens - ignored_phrase_tokens
    )
    if len(guidance_matches) >= 2:
        score += 0.5 * len(guidance_matches)

    return score


def retrieve(
    query: str,
    species: Optional[str] = None,
    top_k: int = 3,
    min_score: float = 1.0,
) -> dict:
    """
    Main retrieval function.
    
    Args:
        query: User query in Hindi/Rajasthani/English
        species: Optional species filter ("cattle", "buffalo", "goat", "sheep")
        top_k: Number of top results to return
        min_score: Minimum relevance score threshold
    
    Returns:
        dict with:
          - results: list of matched KB entries with scores
          - query_tokens: tokens extracted from query
          - retrieval_time_ms: time taken in milliseconds
          - kb_size: number of entries in KB
          - source_found: bool
    """
    start = time.time()
    kb = load_knowledge_base()

    if not kb:
        return {
            "results": [],
            "query_tokens": [],
            "retrieval_time_ms": 0,
            "kb_size": 0,
            "source_found": False,
            "error": "Knowledge base unavailable",
        }

    normalized_query = normalize_text(query)["normalized"]
    query_tokens = tokenize(normalized_query)

    scored_entries = []
    for entry in kb:
        # Species filter
        if species:
            entry_species = entry.get("species", [])
            # "cattle" matches both "cattle" entries and generic "all" entries
            if species not in entry_species and "all" not in entry_species:
                # Also check if entry covers the species under buffalo/cattle generics
                if not (species == "buffalo" and "cattle" in entry_species):
                    continue

        score = score_entry(query_tokens, entry)
        if score >= min_score:
            scored_entries.append((score, entry))

    # Sort by score descending
    scored_entries.sort(key=lambda x: -x[0])
    top_results = scored_entries[:top_k]

    retrieval_time_ms = round((time.time() - start) * 1000, 2)

    return {
        "results": [
            {
                "score": score,
                "id": entry["id"],
                "species": entry.get("species", []),
                "urgency": entry.get("urgency", "general"),
                "general_guidance": entry.get("general_guidance", ""),
                "red_flags": entry.get("red_flags", []),
                "limitations": entry.get("limitations", ""),
                "source_name": entry.get("source_name", "Unknown"),
                "source_url": entry.get("source_url", ""),
                "last_verified": entry.get("last_verified", ""),
                "symptoms": entry.get("symptoms", []),
            }
            for score, entry in top_results
        ],
        "query_tokens": query_tokens,
        "retrieval_time_ms": retrieval_time_ms,
        "kb_size": len(kb),
        "source_found": len(top_results) > 0,
    }


def get_highest_urgency(results: list) -> str:
    """Get the highest urgency level from a list of KB results."""
    urgency_order = {"emergency": 3, "prompt": 2, "general": 1}
    max_urgency = "general"
    for r in results:
        u = r.get("urgency", "general")
        if urgency_order.get(u, 0) > urgency_order.get(max_urgency, 0):
            max_urgency = u
    return max_urgency


def format_sources(results: list) -> str:
    """Format source attributions for display."""
    if not results:
        return "कोई स्रोत नहीं मिला (No source found in knowledge base)"

    sources = []
    for i, r in enumerate(results, 1):
        src = r.get("source_name", "Unknown")
        url = r.get("source_url", "")
        verified = r.get("last_verified", "Unknown")
        sources.append(f"{i}. **{src}**\n   URL: {url}\n   Last verified: {verified}")

    return "\n".join(sources)
