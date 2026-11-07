import {
  apiErrorSchema,
  type ResubmitJobInput,
  type JobLevel,
} from '@launchly/shared';

export type RejectedJobDetail = {
  id: string;
  companyId: string;
  createdById: string;
  title: string;
  description: string;
  level: JobLevel;
  location: string;
  requirements: string[];
  benefits: string[];
  salaryMin: number | null;
  salaryMax: number | null;
  publicationStatus: 'REJECTED' | 'PENDING' | 'PUBLISHED' | 'CLOSED' | 'DRAFT';
  moderationReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export class JobApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'JobApiError';
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const errorParsed = apiErrorSchema.safeParse(json);
    if (errorParsed.success) {
      throw new JobApiError(
        errorParsed.data.error.message,
        errorParsed.data.error.code,
        res.status,
      );
    }
    throw new JobApiError('Đã có lỗi xảy ra', 'UNKNOWN_ERROR', res.status);
  }
  return json as T;
}

export async function getRejectedJob(id: string, token: string): Promise<RejectedJobDetail> {
  const res = await fetch(`/api/jobs/${id}/rejected`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await handleResponse<{ job: RejectedJobDetail }>(res);
  return data.job;
}

export async function resubmitJob(
  id: string,
  token: string,
  payload: ResubmitJobInput,
): Promise<{ message: string; job: RejectedJobDetail }> {
  const res = await fetch(`/api/jobs/${id}/resubmit`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return handleResponse<{ message: string; job: RejectedJobDetail }>(res);
}