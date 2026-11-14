'use client';

import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import type { PracticeHistoryResponse } from '@launchly/shared';
import { Badge } from '@/components/ui/badge';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { listPracticeHistory } from '@/lib/api/interview-practice';

const PAGE_SIZE = 10;

type Loaded = { history: PracticeHistoryResponse } | { error: true } | null;

/** The candidate's completed and still-resumable practice sessions, one page at a time. */
export function PracticeHistory() {
  const t = useTranslations('candidate.interviewPractice');
  const format = useFormatter();
  const [page, setPage] = useState(1);
  const [loaded, setLoaded] = useState<Loaded>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const history = await listPracticeHistory({ page, limit: PAGE_SIZE });
        if (active) setLoaded({ history });
      } catch {
        if (active) setLoaded({ error: true });
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [page, attempt]);

  function go(next: number) {
    setLoaded(null);
    setPage(next);
  }

  if (!loaded) return <Card className="text-sm text-muted-foreground">{t('loading')}</Card>;
  if ('error' in loaded) {
    return (
      <Card className="space-y-3 text-sm text-muted-foreground">
        <p role="alert" className="text-danger">
          {t('history.loadError')}
        </p>
        <Button
          variant="soft"
          onClick={() => {
            setLoaded(null);
            setAttempt((n) => n + 1);
          }}
        >
          {t('history.retry')}
        </Button>
      </Card>
    );
  }

  const { data, pagination } = loaded.history;
  if (data.length === 0) {
    return (
      <Card className="space-y-3 text-sm text-muted-foreground">
        <p>{t('history.empty')}</p>
        <Link href="/interview-practice" className={buttonClasses('primary')}>
          {t('history.startFirst')}
        </Link>
      </Card>
    );
  }

  return (
    <section aria-label={t('history.label')} className="space-y-4">
      <ul className="space-y-3">
        {data.map((item) => {
          const done = item.status === 'COMPLETED';
          return (
            <li key={item.id}>
              <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <Link
                    href={`/interview-practice/${item.id}`}
                    className="font-display font-semibold text-primary hover:underline"
                  >
                    {item.jobTitle}
                  </Link>
                  <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <Badge tone={done ? 'success' : 'warning'} shape="pill">
                      {done ? t('history.completed') : t('history.inProgress')}
                    </Badge>
                    <Badge tone="neutral" shape="pill">
                      {t(`session.scope.${item.scope}`)}
                    </Badge>
                    <span>{t('history.rounds', { count: item.roundCount })}</span>
                    <span>
                      {format.dateTime(new Date(item.completedAt ?? item.createdAt), {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </p>
                </div>
                {!done && (
                  <Link
                    href={`/interview-practice/${item.id}`}
                    className={buttonClasses('soft')}
                    aria-label={t('history.resumeLabel', { job: item.jobTitle })}
                  >
                    {t('history.resume')}
                  </Link>
                )}
              </Card>
            </li>
          );
        })}
      </ul>

      {pagination.totalPages > 1 && (
        <nav aria-label={t('history.pages')} className="flex items-center justify-between gap-3">
          <Button variant="soft" disabled={page <= 1} onClick={() => go(page - 1)}>
            {t('history.previous')}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t('history.pageStatus', {
              page: pagination.page,
              totalPages: pagination.totalPages,
            })}
          </span>
          <Button
            variant="soft"
            disabled={page >= pagination.totalPages}
            onClick={() => go(page + 1)}
          >
            {t('history.next')}
          </Button>
        </nav>
      )}
    </section>
  );
}
