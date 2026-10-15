"""
metrics.py — PashuMitra AI
---------------------------
Records and retrieves evaluation metrics for the demo dashboard.
Innovation 8: Demo and Evaluation Dashboard.

Uses actual measurements, NOT fabricated numbers.
"""

import json
import time
from pathlib import Path
from datetime import datetime

METRICS_PATH = Path(__file__).parent.parent / "data" / "metrics.json"

_session_metrics = {
    "session_start": datetime.now().isoformat(),
    "queries_total": 0,
    "kb_hits": 0,
    "kb_misses": 0,
    "llm_calls": 0,
    "llm_successes": 0,
    "llm_failures": 0,
    "emergency_triggers": 0,
    "response_latencies_ms": [],
    "retrieval_latencies_ms": [],
    "speech_attempts": 0,
    "speech_successes": 0,
}


def record_query(
    kb_hit: bool,
    llm_used: bool,
    llm_success: bool,
    emergency_triggered: bool,
    total_latency_ms: float,
    retrieval_latency_ms: float,
):
    """Record metrics for a single query."""
    global _session_metrics
    _session_metrics["queries_total"] += 1

    if kb_hit:
        _session_metrics["kb_hits"] += 1
    else:
        _session_metrics["kb_misses"] += 1

    if llm_used:
        _session_metrics["llm_calls"] += 1
        if llm_success:
            _session_metrics["llm_successes"] += 1
        else:
            _session_metrics["llm_failures"] += 1

    if emergency_triggered:
        _session_metrics["emergency_triggers"] += 1

    _session_metrics["response_latencies_ms"].append(total_latency_ms)
    _session_metrics["retrieval_latencies_ms"].append(retrieval_latency_ms)


def record_speech(success: bool):
    """Record speech recognition attempt result."""
    _session_metrics["speech_attempts"] += 1
    if success:
        _session_metrics["speech_successes"] += 1


def get_session_stats() -> dict:
    """Calculate statistics from session metrics."""
    m = _session_metrics
    latencies = m["response_latencies_ms"]
    retrieval_latencies = m["retrieval_latencies_ms"]

    def median(lst):
        if not lst:
            return 0
        s = sorted(lst)
        mid = len(s) // 2
        return s[mid] if len(s) % 2 else (s[mid - 1] + s[mid]) / 2

    def avg(lst):
        return round(sum(lst) / len(lst), 1) if lst else 0

    total = m["queries_total"]

    return {
        "queries_total": total,
        "kb_hit_rate": f"{round(m['kb_hits'] / total * 100, 1)}%" if total else "0%",
        "kb_hits": m["kb_hits"],
        "kb_misses": m["kb_misses"],
        "llm_success_rate": (
            f"{round(m['llm_successes'] / m['llm_calls'] * 100, 1)}%"
            if m["llm_calls"] else "N/A"
        ),
        "llm_calls": m["llm_calls"],
        "emergency_triggers": m["emergency_triggers"],
        "median_latency_ms": median(latencies),
        "avg_latency_ms": avg(latencies),
        "median_retrieval_ms": median(retrieval_latencies),
        "speech_attempts": m["speech_attempts"],
        "speech_success_rate": (
            f"{round(m['speech_successes'] / m['speech_attempts'] * 100, 1)}%"
            if m["speech_attempts"] else "N/A"
        ),
        "session_start": m["session_start"],
        "note": "All metrics are measured from actual session interactions, not estimated.",
    }
