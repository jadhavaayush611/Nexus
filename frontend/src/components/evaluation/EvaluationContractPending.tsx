import React from 'react';
import { Database, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../common/Button.tsx';
import type { ApiError } from '../../services/apiClient.ts';
import './EvaluationContractPending.css';

export interface EvaluationContractPendingProps {
  error: ApiError | Error | null;
  onRetry: () => void;
  isLoading?: boolean;
}

export const EvaluationContractPending: React.FC<EvaluationContractPendingProps> = ({
  error,
  onRetry,
  isLoading = false,
}) => {
  const is404 =
    error &&
    typeof error === 'object' &&
    'status' in error &&
    (error as { status: number }).status === 404;

  const isNetwork =
    error &&
    typeof error === 'object' &&
    'isNetworkError' in error &&
    (error as { isNetworkError: boolean }).isNetworkError;

  return (
    <div className="cw-eval-pending" role="region" aria-label="Evaluation benchmark status">
      <div className="cw-eval-pending__badge-row">
        <span className="cw-eval-pending__status-badge">
          {is404
            ? 'CONTRACT PENDING · ENDPOINT NOT IMPLEMENTED'
            : isNetwork
            ? 'BACKEND OFFLINE · RECONNECTING'
            : 'BENCHMARK ENDPOINT UNAVAILABLE'}
        </span>
        <Button
          variant="secondary"
          size="sm"
          icon={<RefreshCw size={13} />}
          isLoading={isLoading}
          onClick={onRetry}
          aria-label="Check evaluation endpoint"
        >
          Check Endpoint
        </Button>
      </div>

      <div className="cw-eval-pending__card">
        <div className="cw-eval-pending__header">
          <div className="cw-eval-pending__icon-wrap">
            <Database size={22} className="cw-eval-pending__icon" aria-hidden="true" />
          </div>
          <div>
            <h3 className="cw-eval-pending__title">
              {is404
                ? 'Benchmark Endpoint (GET /api/evaluation/summary) Pending Backend Integration'
                : 'Unable to Retrieve Benchmark Metrics from Evaluation Service'}
            </h3>
            <p className="cw-eval-pending__desc">
              {is404
                ? 'Teammate B (Matching & Evaluation) has not yet published the evaluation summary endpoint. CaseWeave strictly prohibits inventing vanity accuracy rates.'
                : 'The evaluation endpoint could not be reached. Check if the FastAPI server is running on port 8000.'}
            </p>
          </div>
        </div>

        <div className="cw-eval-pending__details">
          <div className="cw-eval-pending__detail-item">
            <span className="cw-eval-pending__detail-label">Expected API Contract:</span>
            <code className="cw-eval-pending__code">GET /api/evaluation/summary</code>
          </div>
          <div className="cw-eval-pending__detail-item">
            <span className="cw-eval-pending__detail-label">Current Backend Response:</span>
            <span className="cw-eval-pending__error-text">
              {error ? error.message : 'HTTP 404 Not Found'}
            </span>
          </div>
          <div className="cw-eval-pending__detail-item">
            <span className="cw-eval-pending__detail-label">Agreed Schema Payload:</span>
            <span className="cw-eval-pending__detail-val">
              <code>EvaluationSummary</code> (precision, recall, f1_score, confusion_matrix [TP, FP,
              TN, FN], baseline_comparison, error_inspection_samples)
            </span>
          </div>
        </div>

        <div className="cw-eval-pending__integrity-note">
          <AlertCircle size={14} className="cw-eval-pending__integrity-icon" aria-hidden="true" />
          <div className="cw-eval-pending__integrity-text">
            <strong>Data Integrity Commitment:</strong> The frontend will not simulate or fabricate
            benchmark percentages or confusion counts. As soon as the matching team serves real
            evaluated instances, this screen will instantly populate live metrics and diagnostic
            error inspection.
          </div>
        </div>
      </div>
    </div>
  );
};
