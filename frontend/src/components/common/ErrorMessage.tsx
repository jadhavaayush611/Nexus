import React from 'react';
import { AlertCircle, WifiOff, RefreshCw } from 'lucide-react';
import { ApiError } from '../../services/apiClient.ts';
import { Button } from './Button.tsx';
import './ErrorMessage.css';

export interface ErrorMessageProps {
  error: ApiError | Error | string | null;
  title?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  title,
  onRetry,
  isRetrying = false,
  className = '',
}) => {
  if (!error) return null;

  const isApiError = error instanceof ApiError;
  const isNetwork = isApiError && error.isNetworkError;
  const validationErrors = isApiError ? error.validationErrors : undefined;
  const message = typeof error === 'string' ? error : error.message;

  const defaultTitle = isNetwork
    ? 'Backend Connection Unavailable'
    : isApiError && error.status === 422
    ? 'Validation Error'
    : isApiError && error.status === 404
    ? 'Resource Not Found'
    : 'Unable to Load Data';

  return (
    <div
      className={`cw-error-banner ${isNetwork ? 'cw-error-banner--network' : ''} ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="cw-error-banner__header">
        <div className="cw-error-banner__icon">
          {isNetwork ? <WifiOff size={20} aria-hidden="true" /> : <AlertCircle size={20} aria-hidden="true" />}
        </div>
        <div className="cw-error-banner__main">
          <h4 className="cw-error-banner__title">{title || defaultTitle}</h4>
          <p className="cw-error-banner__message">{message}</p>

          {isNetwork && (
            <p className="cw-error-banner__hint">
              Ensure the FastAPI backend service is running locally on <code>http://127.0.0.1:8000</code>. CaseWeave strictly displays authentic backend responses and does not fabricate fake records.
            </p>
          )}

          {validationErrors && validationErrors.length > 0 && (
            <ul className="cw-error-banner__validation-list">
              {validationErrors.map((v, i) => (
                <li key={i}>
                  <strong>{v.field}:</strong> {v.message}
                </li>
              ))}
            </ul>
          )}
        </div>

        {onRetry && (
          <div className="cw-error-banner__action">
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw size={14} className={isRetrying ? 'cw-spin' : ''} />}
              onClick={onRetry}
              disabled={isRetrying}
            >
              {isRetrying ? 'Retrying...' : 'Retry'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
