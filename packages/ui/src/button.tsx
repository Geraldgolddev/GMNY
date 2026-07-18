import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-[var(--gmny-blue-600)] text-white shadow-[0_10px_30px_rgba(37,99,235,0.35)] hover:bg-[var(--gmny-blue-500)] focus-visible:ring-[var(--gmny-blue-400)]',
  secondary:
    'bg-[var(--gmny-surface)] text-[var(--gmny-ink)] border border-[var(--gmny-border)] hover:border-[var(--gmny-blue-400)] hover:bg-[rgba(37,99,235,0.12)]',
  ghost:
    'bg-transparent text-[var(--gmny-blue-300)] hover:bg-[rgba(37,99,235,0.12)] hover:text-white',
  danger: 'bg-red-600 text-white hover:bg-red-500',
};

const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--gmny-bg)]',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
