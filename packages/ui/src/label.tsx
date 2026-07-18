import type { LabelHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode;
}

export function Label({ className, children, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        'mb-1.5 block text-sm font-medium text-[var(--gmny-ink)]',
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}
