'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { PracticeHistoryResponse } from '@launchly/shared';
import { Badge } from '@/components/ui/badge';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { listPracticeHistory } from '@/lib/api/interview-practice';

const PAGE_SIZE = 10;

type Loaded = { history: PracticeHistoryResponse } | { error: string } | null;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** The candidate's completed and still-resumable practice sessions, one page at a time. */
export function PracticeHistory() {
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
        if (active) setLoaded({ error: 'Could not load your practice history.' });
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

  if (!loaded) return <Card className="text-sm text-muted-foreground">Loading…</Card>;
  if ('error' in loaded) {
    return (
      <Card className="space-y-3 text-sm text-muted-foreground">
        <p role="alert" className="text-danger">
          {loaded.error}
        </p>
        <Button
          variant="soft"
          onClick={() => {
            setLoaded(null);
            setAttempt((n) => n + 1);
          }}
        >
          Try again
        </Button>
      </Card>
    );
  }

  const { data, pagination } = loaded.history;
  if (data.length === 0) {
    return (
      <Card className="space-y-3 text-sm text-muted-foreground">
        <p>No practice sessions yet.</p>
        <Link href="/interview-practice" className={buttonClasses('primary')}>
          Start your first practice
        </Link>
      </Card>
    );
  }

  return (
    <section aria-label="Practice history" className="space-y-4">
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
                      {done ? 'Completed' : 'In progress'}
                    </Badge>
                    <span>
                      {item.roundCount} {item.roundCount === 1 ? 'round' : 'rounds'}
                    </span>
                    <span>{formatDate(item.completedAt ?? item.createdAt)}</span>
                  </p>
                </div>
                {!done && (
                  <Link
                    href={`/interview-practice/${item.id}`}
                    className={buttonClasses('soft')}
                    aria-label={`Resume ${item.jobTitle}`}
                  >
                    Resume
                  </Link>
                )}
              </Card>
            </li>
          );
        })}
      </ul>

      {pagination.totalPages > 1 && (
        <nav aria-label="History pages" className="flex items-center justify-between gap-3">
          <Button variant="soft" disabled={page <= 1} onClick={() => go(page - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="soft"
            disabled={page >= pagination.totalPages}
            onClick={() => go(page + 1)}
          >
            Next
          </Button>
        </nav>
      )}
    </section>
  );
}
