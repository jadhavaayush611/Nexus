import React from 'react';
import './Card.css';

export interface CardProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  actions,
  footer,
  padding = 'md',
  className = '',
  style,
  onClick,
}) => {
  const hasHeader = title || subtitle || actions;

  return (
    <section
      className={`cw-card cw-card--padding-${padding} ${onClick ? 'cw-card--interactive' : ''} ${className}`}
      style={style}
      onClick={onClick}
    >
      {hasHeader && (
        <header className="cw-card__header">
          <div className="cw-card__header-content">
            {title && <h3 className="cw-card__title">{title}</h3>}
            {subtitle && <p className="cw-card__subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="cw-card__actions">{actions}</div>}
        </header>
      )}
      <div className="cw-card__body">{children}</div>
      {footer && <footer className="cw-card__footer">{footer}</footer>}
    </section>
  );
};
