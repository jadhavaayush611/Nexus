import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from './Button.tsx';
import './EmptyState.css';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`cw-empty-state ${className}`} role="status">
      <div className="cw-empty-state__icon">
        {icon || <Inbox size={32} aria-hidden="true" />}
      </div>
      <h3 className="cw-empty-state__title">{title}</h3>
      <p className="cw-empty-state__description">{description}</p>
      {actionLabel && onAction && (
        <div className="cw-empty-state__action">
          <Button variant="secondary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
