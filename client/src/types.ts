export type UrgencyLevel = "emergency" | "prompt" | "general";

export interface DialectMatch {
  original_term: string;
  normalized_term: string;
  type: "phrase" | "animal" | "symptom";
}

export interface DialectInfo {
  original: string;
  normalized: string;
  animal_detected: string | null;
  symptoms_detected: string[];
  dialect_matches: DialectMatch[];
  has_dialect_terms: boolean;
}

export interface EmergencyCheck {
  is_emergency: boolean;
  matched_keywords: string[];
  urgency: UrgencyLevel | null;
  message_hi: string | null;
  message_en: string | null;
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
  emergency_check?: EmergencyCheck;
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
  dialect_info?: DialectInfo;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  dialect_info?: DialectInfo;
  response_data?: ResponseData;
  timestamp: string;
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

export interface SystemConfig {
  kb_size: number;
  dialect_loaded: boolean;
  groq_configured: boolean;
  emergency_rules: boolean;
  health_records: string;
  node_version: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  created_at: string;
  last_login_at?: string;
  firebaseUid?: string;
}

