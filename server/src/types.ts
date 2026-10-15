export interface DialectMatch {
  original_term: string;
  normalized_term: string;
  type: "phrase" | "animal" | "symptom";
}

export interface DialectNormalizationResult {
  original: string;
  normalized: string;
  animal_detected: string | null;
  symptoms_detected: string[];
  dialect_matches: DialectMatch[];
  has_dialect_terms: boolean;
}

export type UrgencyLevel = "emergency" | "prompt" | "general";

export interface EmergencyCheckResult {
  is_emergency: boolean;
  matched_keywords: string[];
  urgency: UrgencyLevel | null;
  message_hi: string | null;
  message_en: string | null;
}

export interface PrescriptionCheckResult {
  is_prescription_request: boolean;
  matched_keywords: string[];
  message_hi: string | null;
}

export interface UrgencyDisplay {
  label: string;
  label_en: string;
  color: string;
  bg_color: string;
  border_color: string;
  advice_hi: string;
  advice_en: string;
}

export interface KbEntry {
  id: string;
  species: string[];
  symptoms: string[];
  keywords_hi: string[];
  keywords_rj: string[];
  urgency: UrgencyLevel;
  general_guidance: string;
  red_flags: string[];
  limitations: string;
  source_name: string;
  source_url: string;
  last_verified: string;
}

export interface ScoredKbResult {
  score: number;
  id: string;
  species: string[];
  urgency: UrgencyLevel;
  general_guidance: string;
  red_flags: string[];
  limitations: string;
  source_name: string;
  source_url: string;
  last_verified: string;
  symptoms: string[];
}

export interface RetrievalResult {
  results: ScoredKbResult[];
  query_tokens: string[];
  retrieval_time_ms: number;
  kb_size: number;
  source_found: boolean;
  error?: string;
}

export interface SourceReference {
  name: string;
  url: string;
  verified: string;
  id: string;
}

export interface ResponseData {
  response_text: string;
  response_source: string;
  response_mode: string;
  response_path: string;
  response_path_reason: string;
  kb_urgency: UrgencyLevel;
  final_urgency?: UrgencyLevel;
  emergency_check?: EmergencyCheckResult;
  llm_used: boolean;
  llm_error_category?: string | null;
  llm_latency_ms: number;
  total_latency_ms: number;
  kb_results_count: number;
  sources: SourceReference[];
  limitations: string[];
  cannot_determine: string | null;
  when_to_see_vet: string;
  groq_model?: string | null;
  dialect_info?: DialectNormalizationResult;
}

export interface Animal {
  id: number;
  nickname: string;
  species: string;
  approximate_age?: string;
  notes?: string;
  created_at: string;
  consent_given: number;
}

export interface HealthObservation {
  id: number;
  animal_id: number;
  observation_date: string;
  symptoms: string;
  query: string;
  response_summary: string;
  urgency_level: string;
  created_at: string;
  nickname?: string;
  species?: string;
}

export interface SessionStats {
  queries_total: number;
  kb_hit_rate: string;
  kb_hits: number;
  kb_misses: number;
  llm_success_rate: string;
  llm_calls: number;
  emergency_triggers: number;
  median_latency_ms: number;
  avg_latency_ms: number;
  median_retrieval_ms: number;
  speech_attempts: number;
  speech_success_rate: string;
  session_start: string;
  note: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  created_at: string;
  last_login_at?: string;
}

