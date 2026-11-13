'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { LoaderCircle } from 'lucide-react';
import { validateRoundDrafts, type RoundFormat } from '@launchly/shared';
import { Button } from '@/components/ui/button';
import {
  ROUND_ERROR_TEXT,
  RoundRowsEditor,
  roundRowsFrom,
  type RoundRow,
  type RoundRowErrors,
} from '@/components/recruiter/round-rows-editor';
import { getJobRounds, replaceJobRounds } from '@/lib/api/job-rounds';
import { useAuth } from '@/lib/auth-context';

function validateRows(rows: RoundRow[]): RoundRowErrors[] {
  return validateRoundDrafts(rows).map((errors) => ({
    ...(errors.name && { name: ROUND_ERROR_TEXT.name }),
    ...(errors.format && { format: ROUND_ERROR_TEXT.format }),
    ...(errors.duration && { duration: ROUND_ERROR_TEXT.duration }),
  }));
}

export function RoundsBuilder({ jobId }: { jobId: string }) {
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
        setMessage({ tone: 'danger', text: errorMessage(error) });
      } finally {
        setLoading(false);
      }
    })();
  }, [jobId, status]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    const found = validateRows(rows);
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
      setMessage({ tone: 'success', text: 'Đã lưu quy trình tuyển dụng.' });
    } catch (error) {
      setMessage({ tone: 'danger', text: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  }

  if (status === 'loading') {
    return <p className="text-sm text-muted-foreground">Đang tải quy trình…</p>;
  }
  if (status !== 'authenticated') {
    return (
      <p className="text-sm text-muted-foreground">
        Vui lòng đăng nhập bằng tài khoản nhà tuyển dụng.
      </p>
    );
  }
  if (loading) {
    return <p className="text-sm text-muted-foreground">Đang tải quy trình…</p>;
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
          {saving && <LoaderCircle className="size-4 animate-spin" aria-hidden />} Lưu quy trình
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi. Vui lòng thử lại.';
}
