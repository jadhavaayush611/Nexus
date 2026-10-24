import React from 'react';
import './StatusBadge.css';

export type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

export interface StatusBadgeProps {
  label: string;
  variant?: StatusVariant;
  size?: 'sm' | 'md';
  showDot?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant = 'neutral',
  size = 'md',
  showDot = true,
  className = '',
}) => {
  const combinedClassName = [
    'cw-badge',
    `cw-badge--${variant}`,
    `cw-badge--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={combinedClassName}>
      {showDot && <span className="cw-badge__dot" aria-hidden="true" />}
      <span className="cw-badge__label">{label}</span>
    </span>
  );
};
