import React from 'react';
import './PageHeader.css';

export interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  eyebrow,
  badge,
  actions,
  className = '',
}) => {
  return (
    <header className={`cw-page-header ${className}`}>
      <div className="cw-page-header__main">
        {eyebrow && <div className="cw-page-header__eyebrow">{eyebrow}</div>}
        <div className="cw-page-header__title-row">
          <h1 className="cw-page-header__title">{title}</h1>
          {badge && <div className="cw-page-header__badge">{badge}</div>}
        </div>
        {description && <p className="cw-page-header__description">{description}</p>}
      </div>
      {actions && <div className="cw-page-header__actions">{actions}</div>}
    </header>
  );
};
