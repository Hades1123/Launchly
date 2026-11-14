'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import type { PublicJobItem } from '@launchly/shared';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { searchJobs } from '@/lib/api/jobs';

type Loaded = { jobs: PublicJobItem[] } | { error: string } | null;

/** Recent published jobs with a keyword search; picking one opens its practice start page. */
export function JobPicker() {
  const [keyword, setKeyword] = useState('');
  const [applied, setApplied] = useState('');
  const [loaded, setLoaded] = useState<Loaded>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const result = await searchJobs({ keyword: applied, limit: 10 });
        if (active) setLoaded({ jobs: result.data });
      } catch {
        if (active) setLoaded({ error: 'Could not load jobs. Try again.' });
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [applied]);

  function search(event: FormEvent) {
    event.preventDefault();
    setLoaded(null);
    setApplied(keyword.trim());
  }

  return (
    <section aria-label="Choose a job" className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-display text-xl font-semibold text-foreground">Choose a job</h2>
        <p className="text-sm text-muted-foreground">
          Practice the interview rounds of a published job, before or after you apply.
        </p>
      </div>

      <form onSubmit={search} role="search" className="flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          aria-label="Search jobs"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Job title or keyword"
          className="w-full rounded-control bg-surface-muted px-3 py-2 text-sm text-foreground placeholder:text-subtle-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />
        <Button type="submit" variant="soft">
          Search
        </Button>
      </form>

      {!loaded && <Card className="text-sm text-muted-foreground">Loading…</Card>}
      {loaded && 'error' in loaded && (
        <p role="alert" className="text-sm text-danger">
          {loaded.error}
        </p>
      )}
      {loaded && 'jobs' in loaded && loaded.jobs.length === 0 && (
        <Card className="text-sm text-muted-foreground">No published job matches your search.</Card>
      )}
      {loaded && 'jobs' in loaded && loaded.jobs.length > 0 && (
        <ul className="space-y-3">
          {loaded.jobs.map((job) => (
            <li key={job.id}>
              <Card className="flex flex-col gap-1 p-4">
                <Link
                  href={`/interview-practice?jobId=${job.id}`}
                  className="font-display font-semibold text-primary hover:underline"
                >
                  {job.title}
                </Link>
                <span className="text-sm text-muted-foreground">
                  {job.company.name} · {job.location}
                </span>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
