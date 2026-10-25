import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { apiClient } from '../../services/apiClient.ts';
import type { HealthResponse } from '../../types/api.ts';
import './HealthIndicator.css';

export const HealthIndicator: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  const checkHealth = async () => {
    setIsChecking(true);
    try {
      const res = await apiClient.getHealth();
      setHealth(res);
      setIsOnline(res.status === 'ok');
    } catch {
      setHealth(null);
      setIsOnline(false);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div
      className={`cw-health-indicator ${
        isOnline === true
          ? 'cw-health-indicator--online'
          : isOnline === false
          ? 'cw-health-indicator--offline'
          : 'cw-health-indicator--checking'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="cw-health-indicator__status-dot" aria-hidden="true" />
      <span className="cw-health-indicator__label">
        {isChecking
          ? 'Checking API...'
          : isOnline
          ? `Backend Connected${health?.version ? ` (v${health.version})` : ''}`
          : 'Backend Offline'}
      </span>
      <button
        type="button"
        className="cw-health-indicator__refresh-btn"
        onClick={checkHealth}
        disabled={isChecking}
        title="Re-check backend API liveness (/api/health)"
        aria-label="Re-check backend connection"
      >
        <RefreshCw size={12} className={isChecking ? 'cw-spin' : ''} aria-hidden="true" />
      </button>
    </div>
  );
};
