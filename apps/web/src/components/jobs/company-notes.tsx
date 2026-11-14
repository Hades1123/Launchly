import { useTranslations } from 'next-intl';
import type { ProcessView } from '@launchly/shared';
import { Card } from '@/components/ui/card';

/** The notes a company left for applicants, in saved order. Hidden unless the job has a process and notes. */
export function CompanyNotes({ view }: { view: ProcessView }) {
  const t = useTranslations('jobs.notes');
  if (!view.showNotes) return null;

  return (
    <Card className="space-y-3">
      <h2 className="font-display text-lg font-semibold text-foreground">{t('title')}</h2>
      <ul className="space-y-2">
        {view.notes.map((note) => (
          <li
            key={note.id}
            className="rounded-control bg-surface-muted p-3 text-sm text-foreground"
          >
            {note.content}
          </li>
        ))}
      </ul>
    </Card>
  );
}
