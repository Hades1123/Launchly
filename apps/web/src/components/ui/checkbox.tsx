import type { InputHTMLAttributes } from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/cn';

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> & {
  /** "Some but not all" for a select-all box; shown as a dash. */
  indeterminate?: boolean;
};

/**
 * A 20px box inside a 44px touch target: the native input covers the whole target (invisible),
 * so clicks anywhere in it toggle the box and keyboard and screen readers work as usual.
 */
export function Checkbox({ indeterminate = false, className, checked, ...props }: CheckboxProps) {
  const on = Boolean(checked) || indeterminate;
  return (
    <span
      className={cn('relative inline-flex size-11 shrink-0 items-center justify-center', className)}
    >
      <input
        type="checkbox"
        checked={checked}
        aria-checked={indeterminate ? 'mixed' : undefined}
        ref={(box) => {
          if (box) box.indeterminate = indeterminate;
        }}
        className="peer absolute inset-0 z-10 cursor-pointer opacity-0 disabled:cursor-not-allowed"
        {...props}
      />
      <span
        aria-hidden
        className={cn(
          'pointer-events-none flex size-5 items-center justify-center rounded-md border-2 transition-colors',
          'peer-hover:border-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2',
          on ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-surface',
        )}
      >
        {indeterminate ? (
          <Minus className="size-3.5" strokeWidth={3} />
        ) : (
          checked && <Check className="size-3.5" strokeWidth={3} />
        )}
      </span>
    </span>
  );
}
