'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { validateRoundDrafts, type RoundFormat } from '@launchly/shared';
import { Button } from '@/components/ui/button';
import {
  RoundRowsEditor,
  roundErrorText,
  roundRowsFrom,
  type RoundRow,
  type RoundRowErrors,
  type RoundsTranslator,
} from '@/components/recruiter/round-rows-editor';
import { getJobRounds, replaceJobRounds } from '@/lib/api/job-rounds';
import { useAuth } from '@/lib/auth-context';

function validateRows(rows: RoundRow[], t: RoundsTranslator): RoundRowErrors[] {
  return validateRoundDrafts(rows).map((errors) => ({
    ...(errors.name && { name: roundErrorText('name', t) }),
    ...(errors.format && { format: roundErrorText('format', t) }),
    ...(errors.duration && { duration: roundErrorText('duration', t) }),
  }));
}

export function RoundsBuilder({ jobId }: { jobId: string }) {
  const t = useTranslations('recruiter.rounds');
  const { status } = useAuth();
  const [rows, setRows] = useState<RoundRow[]>([]);
  const [errors, setErrors] = useState<RoundRowErrors[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (status !== 'authenticated' || loadedFor.current === jobId) return;
    loadedFor.current = jobId;
    (async () => {
      try {
        const { rounds } = await getJobRounds(jobId);
        setRows(roundRowsFrom(rounds));
      } catch (error) {
        loadedFor.current = null;
        setMessage({ tone: 'danger', text: errorMessage(error, t) });
      } finally {
        setLoading(false);
      }
    })();
  }, [jobId, status, t]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    const found = validateRows(rows, t);
    if (found.some((e) => Object.keys(e).length > 0)) {
      setErrors(found);
      return;
    }
    setSaving(true);
    try {
      const { rounds } = await replaceJobRounds(jobId, {
        rounds: rows.map((r) => ({
          ...(r.id ? { id: r.id } : {}),
          name: r.name.trim(),
          // validateRows() above rejects an empty format, so it is set here.
          format: r.format as RoundFormat,
          estimatedDurationMinutes: Number(r.duration),
        })),
      });
      setRows(roundRowsFrom(rounds));
      setMessage({ tone: 'success', text: t('builder.saved') });
    } catch (error) {
      setMessage({ tone: 'danger', text: errorMessage(error, t) });
    } finally {
      setSaving(false);
    }
  }

  if (status === 'loading') {
    return <p className="text-sm text-muted-foreground">{t('builder.loading')}</p>;
  }
  if (status !== 'authenticated') {
    return <p className="text-sm text-muted-foreground">{t('builder.signInPrompt')}</p>;
  }
  if (loading) {
    return <p className="text-sm text-muted-foreground">{t('builder.loading')}</p>;
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <RoundRowsEditor
        rows={rows}
        errors={errors}
        onChange={(next) => {
          setRows(next);
          setErrors([]);
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving && <LoaderCircle className="size-4 animate-spin" aria-hidden />}{' '}
          {t('builder.save')}
        </Button>
        {message && (
          <p
            role="status"
            className={message.tone === 'success' ? 'text-sm text-success' : 'text-sm text-danger'}
          >
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}

function errorMessage(error: unknown, t: RoundsTranslator): string {
  return error instanceof Error ? error.message : t('builder.genericError');
}
