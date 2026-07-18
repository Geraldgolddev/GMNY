import type { InputHTMLAttributes } from 'react';
import { cn } from './cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function Input({ className, invalid, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'flex h-11 w-full rounded-lg border bg-[rgba(5,10,20,0.65)] px-3 text-sm text-[var(--gmny-ink)]',
        'placeholder:text-[var(--gmny-muted)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gmny-blue-400)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--gmny-bg)]',
        invalid ? 'border-red-500' : 'border-[var(--gmny-border)]',
        className,
      )}
      {...props}
    />
  );
}
