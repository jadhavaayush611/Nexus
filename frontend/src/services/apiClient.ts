/**
 * CaseWeave Central API Client
 * Strict typed client communicating with FastAPI backend.
 * Never swallows exceptions or fakes data.
 */

import type {
  Complaint,
  DashboardSummary,
  EvaluationSummary,
  Institution,
  Relationship,
} from '../types/entities.ts';
import type {
  ComplaintFilterParams,
  HealthResponse,
  ImportResponse,
  InstitutionFilterParams,
  PaginatedResponse,
  RelationshipFilterParams,
  RelationshipReviewRequest,
  RelationshipReviewResponse,
  UpdateComplaintPayload,
} from '../types/api.ts';

// Central API Base URL — Respects environment variable with fallback to relative /api
const API_BASE_URL = (
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL
    : '/api'
).replace(/\/+$/, '');

export interface FieldValidationError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  public status: number;
  public statusText: string;
  public endpoint: string;
  public isNetworkError: boolean;
  public validationErrors?: FieldValidationError[];
  public rawBody?: unknown;

  constructor(params: {
    message: string;
    status: number;
    statusText: string;
    endpoint: string;
    isNetworkError?: boolean;
    validationErrors?: FieldValidationError[];
    rawBody?: unknown;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.status = params.status;
    this.statusText = params.statusText;
    this.endpoint = params.endpoint;
    this.isNetworkError = params.isNetworkError || false;
    this.validationErrors = params.validationErrors;
    this.rawBody = params.rawBody;
  }
}

/**
 * Helper to build URL query strings from typed parameters
 */
function buildQueryString(params?: Record<string, unknown>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  }

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

/**
 * Core HTTP Request Wrapper
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = 15000
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const headers = new Headers(options.headers || {});
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    // Parse Response Body
    const contentType = response.headers.get('content-type') || '';
    let body: unknown = null;
    if (contentType.includes('application/json')) {
      try {
        body = await response.json();
      } catch {
        body = null;
      }
    } else if (contentType.includes('text/')) {
      body = await response.text();
    }

    // Handle Non-2xx HTTP Errors
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status} (${response.statusText})`;
      let validationErrors: FieldValidationError[] | undefined;

      if (body && typeof body === 'object') {
        const errorRecord = body as Record<string, unknown>;

        // Standard FastAPI / Pydantic validation error parsing (422)
        if (response.status === 422 && Array.isArray(errorRecord.detail)) {
          validationErrors = errorRecord.detail.map((err: unknown) => {
            const errObj = err as Record<string, unknown>;
            const loc = Array.isArray(errObj.loc) ? errObj.loc.slice(1).join('.') : 'body';
            return {
              field: loc || 'field',
              message: String(errObj.msg || 'Invalid value'),
            };
          });
          errorMessage = 'Validation error: please check required fields.';
        } else if (typeof errorRecord.detail === 'string') {
          errorMessage = errorRecord.detail;
        } else if (typeof errorRecord.message === 'string') {
          errorMessage = errorRecord.message;
        }
      }

      throw new ApiError({
        message: errorMessage,
        status: response.status,
        statusText: response.statusText,
        endpoint,
        validationErrors,
        rawBody: body,
      });
    }

    return body as T;
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    // Network or Timeout Failure
    const isAbort = (error as Error)?.name === 'AbortError';
    const message = isAbort
      ? `Request timeout after ${timeoutMs}ms while connecting to backend.`
      : 'Network connection failure. The backend server appears offline or unreachable.';

    throw new ApiError({
      message,
      status: 0,
      statusText: isAbort ? 'Timeout' : 'Network Error',
      endpoint,
      isNetworkError: true,
      rawBody: error,
    });
  }
}

/**
 * Public Typed API Client Object
 */
export const apiClient = {
  /**
   * Health Check
   */
  async getHealth(): Promise<HealthResponse> {
    return request<HealthResponse>('/health', { method: 'GET' });
  },

  /**
   * Operations Dashboard Summary
   */
  async getDashboardSummary(): Promise<DashboardSummary> {
    return request<DashboardSummary>('/dashboard/summary', { method: 'GET' });
  },

  /**
   * Institutions Directory
   */
  async getInstitutions(
    params?: InstitutionFilterParams
  ): Promise<PaginatedResponse<Institution> | Institution[]> {
    const qs = buildQueryString(params as Record<string, unknown>);
    return request<PaginatedResponse<Institution> | Institution[]>(`/institutions${qs}`, {
      method: 'GET',
    });
  },

  /**
   * Institution Profile
   */
  async getInstitutionById(id: string): Promise<Institution> {
    return request<Institution>(`/institutions/${encodeURIComponent(id)}`, {
      method: 'GET',
    });
  },

  /**
   * Complaints Register
   */
  async getComplaints(
    params?: ComplaintFilterParams
  ): Promise<PaginatedResponse<Complaint> | Complaint[]> {
    const qs = buildQueryString(params as Record<string, unknown>);
    return request<PaginatedResponse<Complaint> | Complaint[]>(`/complaints${qs}`, {
      method: 'GET',
    });
  },

  /**
   * Complaint Detail
   */
  async getComplaintById(id: string): Promise<Complaint> {
    return request<Complaint>(`/complaints/${encodeURIComponent(id)}`, {
      method: 'GET',
    });
  },

  /**
   * Update Complaint (Status, Next Action, Role)
   */
  async updateComplaint(
    id: string,
    payload: UpdateComplaintPayload
  ): Promise<Complaint> {
    return request<Complaint>(`/complaints/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Relationships Review Queue
   */
  async getRelationships(
    params?: RelationshipFilterParams
  ): Promise<PaginatedResponse<Relationship> | Relationship[]> {
    const qs = buildQueryString(params as Record<string, unknown>);
    return request<PaginatedResponse<Relationship> | Relationship[]>(`/relationships${qs}`, {
      method: 'GET',
    });
  },

  /**
   * Record Relationship Review Decision (Confirm / Dismiss / Needs Info)
   */
  async reviewRelationship(
    id: string,
    payload: RelationshipReviewRequest
  ): Promise<RelationshipReviewResponse> {
    // Client-side guard for dismissal reason
    if (payload.decision === 'dismissed' && (!payload.reviewer_reason || !payload.reviewer_reason.trim())) {
      throw new ApiError({
        message: 'A non-empty dismissal reason is strictly required when dismissing a relationship suggestion.',
        status: 400,
        statusText: 'Bad Request',
        endpoint: `/relationships/${id}/review`,
        validationErrors: [
          { field: 'reviewer_reason', message: 'Dismissal reason is required' },
        ],
      });
    }

    return request<RelationshipReviewResponse>(
      `/relationships/${encodeURIComponent(id)}/review`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  /**
   * Evaluation & Benchmark Metrics
   */
  async getEvaluationSummary(): Promise<EvaluationSummary> {
    return request<EvaluationSummary>('/evaluation/summary', { method: 'GET' });
  },

  /**
   * Load Deterministic Synthetic Demo Dataset
   */
  async importDemoData(): Promise<ImportResponse> {
    return request<ImportResponse>('/import/demo', { method: 'POST' });
  },

  /**
   * Import Synthetic Complaints via CSV
   */
  async importCsv(file: File): Promise<ImportResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return request<ImportResponse>('/import/csv', {
      method: 'POST',
      body: formData,
    });
  },
};
