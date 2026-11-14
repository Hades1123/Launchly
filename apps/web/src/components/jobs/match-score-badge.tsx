import { Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';

/** CV match score: strong matches (85%+) get the success accent. */
export function MatchScoreBadge({ score }: { score: number }) {
  const t = useTranslations('jobs.matchScore');
  if (score >= 85) {
    return (
      <Badge tone="success" shape="pill" className="font-semibold shadow-card">
        <Zap className="size-3" strokeWidth={2} aria-hidden />
        {t('strong', { score })}
      </Badge>
    );
  }
  return (
    <Badge tone="neutral" shape="pill">
      {t('normal', { score })}
    </Badge>
  );
}
