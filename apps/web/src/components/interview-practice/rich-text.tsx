import type { RichSegment } from '@/components/interview-practice/mock-interview-session';
import { cn } from '@/lib/cn';

type RichTextProps = {
  segments: RichSegment[];
  /** `inverse` styles code spans for text on a `bg-primary` bubble. */
  variant?: 'default' | 'inverse';
};

export function RichText({ segments, variant = 'default' }: RichTextProps) {
  return (
    <>
      {segments.map((segment, index) => {
        if (typeof segment === 'string') return <span key={index}>{segment}</span>;
        if ('strong' in segment) {
          return (
            <strong key={index} className="font-semibold text-primary">
              {segment.strong}
            </strong>
          );
        }
        return (
          <code
            key={index}
            className={cn(
              'rounded px-1 font-mono text-xs',
              variant === 'inverse' ? 'bg-primary-hover' : 'bg-surface-strong',
            )}
          >
            {segment.code}
          </code>
        );
      })}
    </>
  );
}
