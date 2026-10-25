import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import './MetricCard.css';

export interface MetricCardProps {
  label: string;
  value: number | string | undefined | null;
  caption: string;
  targetRoute?: string;
  badgeLabel?: string;
  badgeVariant?: 'neutral' | 'warning' | 'error' | 'info' | 'success';
  icon?: React.ReactNode;
  isLoading?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  caption,
  targetRoute,
  badgeLabel,
  badgeVariant = 'neutral',
  icon,
  isLoading = false,
}) => {
  const content = (
    <div className={`cw-metric-card ${targetRoute ? 'cw-metric-card--interactive' : ''}`}>
      <div className="cw-metric-card__header">
        <span className="cw-metric-card__label">{label}</span>
        {icon && <span className="cw-metric-card__icon" aria-hidden="true">{icon}</span>}
      </div>

      <div className="cw-metric-card__body">
        {isLoading ? (
          <div className="cw-metric-card__skeleton" aria-hidden="true" />
        ) : (
          <div className="cw-metric-card__value-row">
            <span className="cw-metric-card__value">
              {value !== undefined && value !== null ? value : '—'}
            </span>
            {badgeLabel && (
              <span className={`cw-metric-card__badge cw-metric-card__badge--${badgeVariant}`}>
                {badgeLabel}
              </span>
            )}
          </div>
        )}
        <p className="cw-metric-card__caption">{caption}</p>
      </div>

      {targetRoute && (
        <div className="cw-metric-card__footer">
          <span className="cw-metric-card__link-text">View filtered records</span>
          <ArrowUpRight size={14} aria-hidden="true" />
        </div>
      )}
    </div>
  );

  if (targetRoute) {
    return (
      <Link to={targetRoute} className="cw-metric-card-link">
        {content}
      </Link>
    );
  }

  return content;
};
