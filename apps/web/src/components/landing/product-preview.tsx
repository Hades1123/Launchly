import { Check, CircleDashed, MapPin, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';

const rounds = [
  { name: 'Sàng lọc CV', note: '3 ngày làm việc', state: 'done' },
  { name: 'Bài test React', note: 'Làm tại nhà, 90 phút', state: 'current' },
  { name: 'Phỏng vấn kỹ thuật', note: 'Online, 45 phút', state: 'next' },
  { name: 'Phỏng vấn văn hoá', note: 'Tại văn phòng', state: 'next' },
] as const;

const matched = ['React', 'TypeScript', 'Git'];
const missing = ['Kiểm thử'];

/**
 * A still of the real product: a job's hiring rounds and a CV fit result, drawn with the same
 * tokens as the job page. Decorative, so screen readers skip it.
 */
export function ProductPreview() {
  return (
    <div aria-hidden className="relative">
      <div className="space-y-5 rounded-card bg-surface p-6 shadow-card-hover">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-control bg-secondary font-display text-base font-bold text-primary">
              FE
            </span>
            <div>
              <p className="font-display text-base font-semibold text-foreground">
                Thực tập sinh Frontend
              </p>
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="size-3.5" strokeWidth={1.75} />
                TP. Hồ Chí Minh
              </p>
            </div>
          </div>
          <Badge tone="primary" shape="pill">
            Intern
          </Badge>
        </div>

        <div className="space-y-3 rounded-card bg-surface-muted p-4">
          <p className="text-xs font-semibold tracking-wider text-subtle-foreground uppercase">
            Quy trình tuyển dụng
          </p>
          <ol className="space-y-3">
            {rounds.map((round, index) => (
              <li key={round.name} className="flex items-start gap-3">
                <span
                  className={cn(
                    'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                    round.state === 'done' && 'bg-success text-primary-foreground',
                    round.state === 'current' &&
                      'bg-primary text-primary-foreground motion-safe:animate-pulse',
                    round.state === 'next' && 'bg-surface-strong text-subtle-foreground',
                  )}
                >
                  {round.state === 'done' ? (
                    <Check className="size-3.5" strokeWidth={2.5} />
                  ) : (
                    index + 1
                  )}
                </span>
                <div className="min-w-0">
                  <p
                    className={cn(
                      'text-sm font-semibold',
                      round.state === 'next' ? 'text-muted-foreground' : 'text-foreground',
                    )}
                  >
                    {round.name}
                  </p>
                  <p className="text-xs text-subtle-foreground">{round.note}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="mt-4 ml-auto w-full max-w-sm space-y-3 rounded-card bg-surface p-5 shadow-card-hover sm:-mt-10 sm:mr-6 lg:mr-0">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Sparkles className="size-4 text-primary" strokeWidth={1.75} />
            CV của bạn khớp
          </p>
          <span className="font-display text-2xl font-bold text-success">80%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-strong">
          <div className="h-full w-4/5 rounded-full bg-success" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {matched.map((skill) => (
            <Badge key={skill} tone="success">
              <Check className="size-3" strokeWidth={2.5} />
              {skill}
            </Badge>
          ))}
          {missing.map((skill) => (
            <Badge key={skill} tone="warning">
              <CircleDashed className="size-3" strokeWidth={2} />
              {skill}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
