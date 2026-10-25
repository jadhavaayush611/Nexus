/**
 * CaseWeave Core Entity Types
 * Authoritative types based on team specification for PS SIH26264.
 * Synthetic demo data only.
 */

export type BureauName =
  | 'Approval'
  | 'Policy & Academic Planning'
  | 'Student Welfare'
  | 'Administration'
  | string; // Support other seeded bureaus

export type ComplaintStatus =
  | 'open'
  | 'under_review'
  | 'resolved'
  | 'escalated'
  | string;

export type RelationshipState =
  | 'suggested'
  | 'confirmed'
  | 'dismissed'
  | 'needs_info';

export type ScoreBand = 'High' | 'Review' | 'Weak';

export interface Institution {
  id: string;
  canonical_name: string;
  normalized_identifier: string; // Permanent Institute ID (e.g., INST-2026-084)
  aliases: string[];
  region?: string | null;
  type?: string | null;
  created_at?: string;
  updated_at?: string;
  // Optional summary fields populated by backend
  complaints_count?: number;
  bureaus_represented?: string[];
  latest_activity_at?: string | null;
}

export interface Complaint {
  id: string;
  external_reference: string; // e.g., AICTE/APP/2026/0412
  institution_id: string | null;
  institution_name_raw: string;
  bureau: BureauName;
  category: string;
  description: string;
  submitted_at: string; // ISO 8601 string
  status: ComplaintStatus;
  assigned_role: string;
  next_action: string;
  due_at: string | null; // ISO 8601 string or null
  created_at: string;
  updated_at: string;
  // Optional relations when embedded
  institution?: Institution | null;
  relationships_count?: number;
}

export interface SignalDetail {
  name: string;
  score: number; // 0.0 to 1.0
  direction: 'supports' | 'conflicts' | 'neutral';
  explanation: string;
  observed_value?: string;
}

export interface EvidencePayload {
  institution_match?: {
    matched: boolean;
    canonical_id?: string;
    similarity: number;
    notes?: string;
  };
  category_compatibility?: {
    compatible: boolean;
    category_a: string;
    category_b: string;
    similarity: number;
  };
  date_proximity?: {
    days_apart: number;
    score: number;
  };
  text_similarity?: {
    score: number;
    method: string; // e.g. "tfidf_cosine"
    excerpt_overlap?: string[];
  };
  signals_list?: SignalDetail[];
  summary_reasoning?: string;
  [key: string]: unknown; // Preserve any other backend-supplied signals without failing
}

export interface Relationship {
  id: string;
  complaint_a_id: string;
  complaint_b_id: string;
  score: number; // 0.0 to 1.0
  score_band: ScoreBand;
  evidence_json: EvidencePayload;
  state: RelationshipState;
  reviewer_reason: string | null; // Strictly required when state === 'dismissed'
  reviewed_by_demo_role: string | null;
  created_at: string;
  updated_at: string;
  // Hydrated complaint objects when joined by backend
  complaint_a?: Complaint;
  complaint_b?: Complaint;
}

export interface AuditEvent {
  id: string;
  entity_type: 'complaint' | 'relationship' | 'institution' | 'import';
  entity_id: string;
  event_type: string;
  actor_demo_role: string;
  occurred_at: string; // ISO timestamp
  details_json: Record<string, unknown>;
}

export interface DashboardSummary {
  open_complaints_count: number;
  relationships_awaiting_review_count: number;
  overdue_next_actions_count: number;
  cross_bureau_links_count: number;
  recent_activity?: AuditEvent[];
}

export interface EvaluationConfusionMatrix {
  true_positives: number;
  false_positives: number;
  true_negatives: number;
  false_negatives: number;
}

export interface EvaluationSamplePair {
  pair_id: string;
  complaint_a_ref: string;
  complaint_b_ref: string;
  institution_name: string;
  true_label: 'related' | 'unrelated';
  predicted_state: 'suggested' | 'rejected';
  score: number;
  classification: 'TP' | 'FP' | 'TN' | 'FN';
  reason: string;
}

export interface EvaluationSummary {
  dataset_name: string;
  total_labelled_pairs: number;
  precision: number;
  recall: number;
  f1_score: number;
  confusion_matrix: EvaluationConfusionMatrix;
  baseline_comparison?: {
    baseline_name: string;
    precision: number;
    recall: number;
    f1_score: number;
  };
  error_inspection_samples?: EvaluationSamplePair[];
  methodology_notes?: string[];
}
