import { Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/** CV match score: strong matches (85%+) get the success accent. */
export function MatchScoreBadge({ score }: { score: number }) {
  if (score >= 85) {
    return (
      <Badge tone="success" shape="pill" className="font-semibold shadow-card">
        <Zap className="size-3" strokeWidth={2} aria-hidden />
        {score}% Match CV
      </Badge>
    );
  }
  return (
    <Badge tone="neutral" shape="pill">
      {score}% Match
    </Badge>
  );
}
