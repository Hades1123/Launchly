import type { AssessmentDto } from '@launchly/shared';
import { MatchGauge } from '@/components/cv-review/match-gauge';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

/** The AI's verdict: score, what matches, what is missing, and how to improve. */
export function FitResult({ assessment }: { assessment: AssessmentDto }) {
  const { score, matched, missing, suggestions, evidence } = assessment.result;
  return (
    <section aria-label="Analysis result" className="space-y-6">
      <Card className="flex flex-col items-center gap-6 sm:flex-row">
        <MatchGauge score={Math.round(score)} />
        <div className="space-y-1">
          <h2 className="font-display text-2xl font-semibold text-foreground">Analysis result</h2>
          <p className="text-sm text-muted-foreground">
            {matched.length} matching points · {missing.length} gaps
          </p>
        </div>
      </Card>

      {matched.length > 0 && (
        <Card className="space-y-3">
          <h3 className="font-display text-lg font-semibold text-foreground">What matches</h3>
          <ul className="flex flex-wrap gap-2">
            {matched.map((item, index) => (
              <li key={`${index}-${item.point}`}>
                <Badge tone="success" shape="pill">
                  {item.point}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {missing.length > 0 && (
        <Card className="space-y-3">
          <h3 className="font-display text-lg font-semibold text-foreground">What is missing</h3>
          <ul className="space-y-2 text-sm">
            {missing.map((item, index) => (
              <li key={`${index}-${item.skill}`} className="flex items-center gap-2">
                <Badge tone={item.importance === 'required' ? 'danger' : 'warning'} shape="pill">
                  {item.importance === 'required' ? 'Required' : 'Nice to have'}
                </Badge>
                <span className="text-foreground">{item.skill}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="space-y-3">
        <h3 className="font-display text-lg font-semibold text-foreground">How to improve</h3>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-foreground marker:text-primary">
          {suggestions.map((item, index) => (
            <li key={`${index}-${item}`}>{item}</li>
          ))}
        </ul>
      </Card>

      {evidence.length > 0 && (
        <Card className="space-y-3">
          <h3 className="font-display text-lg font-semibold text-foreground">
            Evidence from your CV
          </h3>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {evidence.map((item, index) => (
              <li key={`${index}-${item}`}>“{item}”</li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
