/* ──────────────────────────────────────────
   TicketIQ — Typed API responses
   ────────────────────────────────────────── */

// ─── Prediction ────────────────────────────
export interface Entity {
  text: string;
  label: 'ORDER_ID' | 'AMOUNT' | 'ERROR_CODE' | 'DATE' | 'EMAIL' | string;
  start: number;
  end: number;
}

export interface ExplanationWord {
  word: string;
  weight: number;
}

export interface SimilarTicket {
  id: string;
  text: string;
  similarity: number;
  category: string;
  resolution: string;
}

export interface PipelineStages {
  raw: string;
  normalized: string;
  tokens: string[];
  without_stopwords: string[];
  lemmas: string[];
}

export interface SentimentResult {
  label: 'positive' | 'negative' | 'neutral';
  score: number;
}

export interface PredictionResponse {
  category: string;
  category_confidence: number;
  urgency: 'Low' | 'Medium' | 'High' | 'Critical';
  urgency_confidence: number;
  sentiment: SentimentResult;
  entities: Entity[];
  explanation: {
    category: ExplanationWord[];
    urgency: ExplanationWord[];
  };
  similar_tickets: SimilarTicket[];
  suggested_resolution: string | null;
  needs_review: boolean;
  pipeline: PipelineStages;
  ticket_id: string;
}

// ─── Insights ──────────────────────────────
export interface KPIs {
  tickets_analyzed: number;
  high_critical_pct: number;
  top_category: string;
  duplicate_rate: number;
}

export interface Topic {
  id: string;
  label: string;
  keywords: string[];
  count: number;
}

export interface TrendPoint {
  date: string;
  topic: string;
  count: number;
}

export interface Spike {
  topic: string;
  date: string;
  increase_pct: number;
}

export interface KeywordEntry {
  word: string;
  count: number;
  category: string;
}

export interface CategoryDistItem {
  category: string;
  count: number;
}

export interface UrgencyDistItem {
  urgency: string;
  count: number;
}

export interface InsightsResponse {
  kpis: KPIs;
  topics: Topic[];
  trends: TrendPoint[];
  spikes: Spike[];
  keywords: KeywordEntry[];
  category_distribution: CategoryDistItem[];
  urgency_distribution: UrgencyDistItem[];
}

// ─── Models ────────────────────────────────
export interface ModelMetrics {
  name: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
}

export interface ConfusionMatrix {
  labels: string[];
  matrix: number[][];
}

export interface PerClassMetric {
  label: string;
  precision: number;
  recall: number;
  f1: number;
}

export interface ModelsResponse {
  models: ModelMetrics[];
  confusion_matrices: Record<string, ConfusionMatrix>;
  per_class: Record<string, PerClassMetric[]>;
}

export interface ModelPredictResponse {
  category: string;
  confidence: number;
}

// ─── Feedback ──────────────────────────────
export interface FeedbackPayload {
  ticket_id: string;
  text: string;
  predicted_category: string;
  correct_category: string;
  correct_urgency: string;
}

// ─── Review Queue ──────────────────────────
export interface ReviewItem {
  id: string;
  text: string;
  predicted_category: string;
  predicted_urgency: string;
  corrected_category: string | null;
  corrected_urgency: string | null;
  status: 'pending' | 'used_for_retraining';
  created_at: string;
  confidence: number;
}

export interface RetrainResult {
  status: string;
  f1_before: number;
  f1_after: number;
}

// ─── Health ────────────────────────────────
export interface HealthResponse {
  status: string;
  version: string;
}
