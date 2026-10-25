/**
 * CaseWeave API Request & Response Contracts
 */

import type {
  BureauName,
  ComplaintStatus,
  Relationship,
  RelationshipState,
  ScoreBand,
} from './entities.ts';

// Standard Paginated List Wrapper
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages?: number;
}

// Health Check Response
export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  version?: string;
  database?: string;
  synthetic_records_loaded?: boolean;
  timestamp?: string;
}

// Filter Query Parameters for Complaints
export interface ComplaintFilterParams {
  search?: string; // Search across reference or text
  bureau?: BureauName;
  status?: ComplaintStatus;
  category?: string;
  institution_id?: string;
  relationship_state?: RelationshipState;
  due_status?: 'overdue' | 'due_soon' | 'all';
  page?: number;
  limit?: number;
  sort_by?: 'submitted_at' | 'due_at' | 'external_reference';
  sort_order?: 'asc' | 'desc';
}

// Filter Query Parameters for Institutions
export interface InstitutionFilterParams {
  search?: string;
  region?: string;
  has_complaints?: boolean;
  page?: number;
  limit?: number;
}

// Filter Query Parameters for Relationships
export interface RelationshipFilterParams {
  state?: RelationshipState;
  score_band?: ScoreBand;
  bureau?: BureauName;
  institution_id?: string;
  page?: number;
  limit?: number;
}

// Complaint Mutation Payloads
export interface CreateComplaintPayload {
  external_reference: string;
  institution_name_raw: string;
  institution_id?: string | null;
  bureau: BureauName;
  category: string;
  description: string;
  assigned_role: string;
  next_action: string;
  due_at?: string | null;
}

export interface UpdateComplaintPayload {
  status?: ComplaintStatus;
  assigned_role?: string;
  next_action?: string;
  due_at?: string | null;
}

// Relationship Review Payload
export interface RelationshipReviewRequest {
  decision: 'confirmed' | 'dismissed' | 'needs_info';
  reviewer_reason?: string; // Required when decision === 'dismissed'
  demo_role?: string;
}

export interface RelationshipReviewResponse {
  success: boolean;
  relationship: Relationship;
  message?: string;
}

// CSV / Demo Import Responses
export interface RowValidationError {
  row_number: number;
  field: string;
  message: string;
  raw_value?: string;
}

export interface ImportResponse {
  success: boolean;
  rows_processed: number;
  rows_accepted: number;
  rows_rejected: number;
  validation_errors: RowValidationError[];
  message: string;
}
