import { SessionStats } from "../types.js";

const sessionMetrics = {
  session_start: new Date().toISOString(),
  queries_total: 0,
  kb_hits: 0,
  kb_misses: 0,
  llm_calls: 0,
  llm_successes: 0,
  llm_failures: 0,
  emergency_triggers: 0,
  response_latencies_ms: [] as number[],
  retrieval_latencies_ms: [] as number[],
  speech_attempts: 0,
  speech_successes: 0,
};

export function recordQuery(
  kbHit: boolean,
  llmUsed: boolean,
  llmSuccess: boolean,
  emergencyTriggered: boolean,
  totalLatencyMs: number,
  retrievalLatencyMs: number
): void {
  sessionMetrics.queries_total += 1;

  if (kbHit) {
    sessionMetrics.kb_hits += 1;
  } else {
    sessionMetrics.kb_misses += 1;
  }

  if (llmUsed) {
    sessionMetrics.llm_calls += 1;
    if (llmSuccess) {
      sessionMetrics.llm_successes += 1;
    } else {
      sessionMetrics.llm_failures += 1;
    }
  }

  if (emergencyTriggered) {
    sessionMetrics.emergency_triggers += 1;
  }

  sessionMetrics.response_latencies_ms.push(totalLatencyMs);
  sessionMetrics.retrieval_latencies_ms.push(retrievalLatencyMs);
}

export function recordSpeech(success: boolean): void {
  sessionMetrics.speech_attempts += 1;
  if (success) {
    sessionMetrics.speech_successes += 1;
  }
}

function calculateMedian(arr: number[]): number {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10;
}

function calculateAvg(arr: number[]): number {
  if (!arr.length) return 0;
  const sum = arr.reduce((acc, val) => acc + val, 0);
  return Math.round((sum / arr.length) * 10) / 10;
}

export function getSessionStats(): SessionStats {
  const m = sessionMetrics;
  const total = m.queries_total;

  return {
    queries_total: total,
    kb_hit_rate: total > 0 ? `${Math.round((m.kb_hits / total) * 1000) / 10}%` : "0%",
    kb_hits: m.kb_hits,
    kb_misses: m.kb_misses,
    llm_success_rate:
      m.llm_calls > 0
        ? `${Math.round((m.llm_successes / m.llm_calls) * 1000) / 10}%`
        : "N/A",
    llm_calls: m.llm_calls,
    emergency_triggers: m.emergency_triggers,
    median_latency_ms: calculateMedian(m.response_latencies_ms),
    avg_latency_ms: calculateAvg(m.response_latencies_ms),
    median_retrieval_ms: calculateMedian(m.retrieval_latencies_ms),
    speech_attempts: m.speech_attempts,
    speech_success_rate:
      m.speech_attempts > 0
        ? `${Math.round((m.speech_successes / m.speech_attempts) * 1000) / 10}%`
        : "N/A",
    session_start: m.session_start,
    note: "All metrics are measured from actual session interactions, not estimated.",
  };
}
