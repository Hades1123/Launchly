'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getRejectedJob, resubmitJob, type RejectedJobDetail } from '@/lib/jobs-api';
import { resubmitJobSchema, type JobLevel } from '@launchly/shared';

type FormState = {
  title: string;
  level: JobLevel;
  location: string;
  salaryMin: string;
  salaryMax: string;
  description: string;
  requirements: string;
  benefits: string;
};

export default function EditRejectedJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { accessToken, user, status } = useAuth();

  const [job, setJob] = useState<RejectedJobDetail | null>(null);
  const [form, setForm] = useState<FormState>({
    title: '',
    level: 'FRESHER',
    location: '',
    salaryMin: '',
    salaryMax: '',
    description: '',
    requirements: '',
    benefits: '',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'anonymous' || !accessToken) {
      router.push('/login');
      return;
    }
    if (user && user.role !== 'RECRUITER') {
      setErrorMessage('Chỉ nhà tuyển dụng mới có quyền truy cập trang này.');
      setIsLoading(false);
      return;
    }

    async function fetchJob() {
      try {
        const data = await getRejectedJob(id, accessToken!);
        setJob(data);
        setForm({
          title: data.title,
          level: data.level,
          location: data.location,
          salaryMin: data.salaryMin !== null ? String(data.salaryMin) : '',
          salaryMax: data.salaryMax !== null ? String(data.salaryMax) : '',
          description: data.description,
          requirements: data.requirements.join('\n'),
          benefits: data.benefits.join('\n'),
        });
      } catch (err: unknown) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Không thể tải thông tin công việc.',
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchJob();
  }, [id, accessToken, status, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    const reqArray = form.requirements
      .split('\n')
      .map((r) => r.trim())
      .filter(Boolean);

    const benArray = form.benefits
      .split('\n')
      .map((b) => b.trim())
      .filter(Boolean);

    const payloadRaw = {
      title: form.title.trim(),
      level: form.level,
      location: form.location.trim(),
      description: form.description.trim(),
      requirements: reqArray,
      benefits: benArray,
      salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
      salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
    };

    const parseResult = resubmitJobSchema.safeParse(payloadRaw);

    if (!parseResult.success) {
      const errors: Record<string, string> = {};
      parseResult.error.issues.forEach((issue) => {
        const field = issue.path[0];
        if (field) errors[String(field)] = issue.message;
      });
      setFieldErrors(errors);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await resubmitJob(id, accessToken!, parseResult.data);
      setSuccessMessage(res.message);
      setTimeout(() => {
        router.push('/jobs');
      }, 1500);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Gửi lại thất bại. Vui lòng thử lại.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <p className="text-gray-500 text-sm animate-pulse">Đang tải dữ liệu tin tuyển dụng...</p>
      </div>
    );
  }

  if (errorMessage && !job) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4">
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-lg text-center">
          <p className="font-semibold mb-2">Không thể tải thông tin</p>
          <p className="text-sm mb-4">{errorMessage}</p>
          <Link
            href="/jobs"
            className="inline-block px-4 py-2 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 transition"
          >
            Quay lại danh sách tin
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chỉnh sửa và Nộp lại tin tuyển dụng</h1>
          <p className="text-sm text-gray-500 mt-1">
            Điều chỉnh lại nội dung theo yêu cầu kiểm duyệt để tin được xét duyệt lại.
          </p>
        </div>
        <Link
          href="/jobs"
          className="text-sm text-gray-600 hover:text-gray-900 transition"
        >
          ← Quay lại
        </Link>
      </div>

      {job?.moderationReason && (
        <div className="mb-8 rounded-lg border-l-4 border-amber-500 bg-amber-50 p-4 shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-amber-500"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-amber-800">
                Lý do từ chối từ người kiểm duyệt
              </h3>
              <p className="mt-1 text-sm text-amber-700">{job.moderationReason}</p>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 text-sm">
          {successMessage} Đang chuyển hướng về danh sách tin...
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tiêu đề công việc <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Ví dụ: Senior Backend Engineer (Node.js)"
          />
          {fieldErrors.title && <p className="mt-1 text-xs text-red-600">{fieldErrors.title}</p>}
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cấp bậc (Level) <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={form.level}
              onChange={(e) => setForm({ ...form, level: e.target.value as JobLevel })}
            >
              <option value="INTERN">Thực tập sinh (INTERN)</option>
              <option value="FRESHER">Mới tốt nghiệp (FRESHER)</option>
              <option value="SENIOR">Kỳ cựu (SENIOR)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Địa điểm làm việc <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Ví dụ: Hồ Chí Minh, Hybrid"
            />
            {fieldErrors.location && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.location}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lương tối thiểu (VND)
            </label>
            <input
              type="number"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={form.salaryMin}
              onChange={(e) => setForm({ ...form, salaryMin: e.target.value })}
              placeholder="Ví dụ: 15000000"
            />
            {fieldErrors.salaryMin && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.salaryMin}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lương tối đa (VND)
            </label>
            <input
              type="number"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={form.salaryMax}
              onChange={(e) => setForm({ ...form, salaryMax: e.target.value })}
              placeholder="Ví dụ: 30000000"
            />
            {fieldErrors.salaryMax && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.salaryMax}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mô tả chi tiết công việc <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={5}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Mô tả trách nhiệm công việc, môi trường làm việc..."
          />
          {fieldErrors.description && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.description}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Yêu cầu công việc (mỗi dòng một yêu cầu) <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={4}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            value={form.requirements}
            onChange={(e) => setForm({ ...form, requirements: e.target.value })}
            placeholder="Có kinh nghiệm 2+ năm với TypeScript&#10;Hiểu sâu về cơ sở dữ liệu PostgreSQL"
          />
          {fieldErrors.requirements && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.requirements}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quyền lợi & Phúc lợi (mỗi dòng một quyền lợi)
          </label>
          <textarea
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            value={form.benefits}
            onChange={(e) => setForm({ ...form, benefits: e.target.value })}
            placeholder="Bảo hiểm sức khỏe cao cấp&#10;Thưởng hiệu suất 2 lần/năm"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <Link
            href="/jobs"
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            Hủy bỏ
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium shadow-sm transition disabled:opacity-50"
          >
            {isSubmitting ? 'Đang gửi...' : 'Nộp lại để xét duyệt'}
          </button>
        </div>
      </form>
    </div>
  );
}