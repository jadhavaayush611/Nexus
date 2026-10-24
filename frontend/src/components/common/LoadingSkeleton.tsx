import React from 'react';
import './LoadingSkeleton.css';

export interface LoadingSkeletonProps {
  variant?: 'text' | 'card' | 'table-row' | 'metric';
  count?: number;
  height?: string | number;
  width?: string | number;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant = 'text',
  count = 1,
  height,
  width,
  className = '',
}) => {
  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <div
      className={`cw-skeleton-group cw-skeleton-group--${variant} ${className}`}
      role="status"
      aria-live="polite"
      aria-label="Loading content..."
    >
      <span className="sr-only">Loading content...</span>
      {items.map((key) => (
        <div
          key={key}
          className={`cw-skeleton cw-skeleton--${variant}`}
          style={{
            height: height !== undefined ? height : undefined,
            width: width !== undefined ? width : undefined,
          }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
};
