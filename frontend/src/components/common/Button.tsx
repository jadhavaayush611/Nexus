import React from 'react';
import './Button.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  isLoading = false,
  disabled,
  className = '',
  type = 'button',
  ...rest
}) => {
  const combinedClassName = [
    'cw-button',
    `cw-button--${variant}`,
    `cw-button--${size}`,
    isLoading ? 'cw-button--loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={combinedClassName}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...rest}
    >
      {isLoading ? (
        <span className="cw-button__spinner" aria-hidden="true" />
      ) : (
        icon && iconPosition === 'left' && <span className="cw-button__icon">{icon}</span>
      )}
      <span className="cw-button__label">{children}</span>
      {!isLoading && icon && iconPosition === 'right' && (
        <span className="cw-button__icon">{icon}</span>
      )}
    </button>
  );
};
