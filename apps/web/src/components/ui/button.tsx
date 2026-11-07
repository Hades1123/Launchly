import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const variants = {
  primary: 'bg-primary text-primary-foreground shadow-card-hover hover:bg-primary-hover',
  soft: 'bg-primary-subtle text-primary-subtle-foreground shadow-card hover:bg-secondary',
  ghost: 'text-muted-foreground hover:bg-secondary hover:text-foreground',
  icon: 'bg-secondary text-foreground hover:text-primary',
} as const;

export type ButtonVariant = keyof typeof variants;

/** Shared class string so links can look like buttons. */
export function buttonClasses(variant: ButtonVariant = 'primary', className?: string): string {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-control text-sm font-semibold transition-colors',
    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
    variant === 'icon' ? 'p-2' : 'px-4 py-2',
    variants[variant],
    className,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant };

export function Button({ variant = 'primary', className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, className)} {...props} />;
}
