import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  ArrowRight,
  Check,
  CircleDashed,
  FileSearch,
  ListChecks,
  MessagesSquare,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type Feature = {
  title: string;
  body: string;
  href: string;
  action: string;
  icon: LucideIcon;
  preview: ReactNode;
};

const features: Feature[] = [
  {
    title: 'Đánh giá CV theo từng tin',
    body: 'Chọn một tin tuyển dụng, AI so CV của bạn với yêu cầu và chỉ ra kỹ năng đã có, kỹ năng còn thiếu.',
    href: '/cv-review',
    action: 'Kiểm tra CV',
    icon: FileSearch,
    preview: (
      <div className="flex flex-wrap gap-1.5">
        {['SQL', 'Python', 'Excel'].map((skill) => (
          <Badge key={skill} tone="success">
            <Check className="size-3" strokeWidth={2.5} />
            {skill}
          </Badge>
        ))}
        <Badge tone="warning">
          <CircleDashed className="size-3" strokeWidth={2} />
          Power BI
        </Badge>
      </div>
    ),
  },
  {
    title: 'Luyện phỏng vấn với AI',
    body: 'Trả lời câu hỏi sát với vị trí bạn nhắm tới và nhận nhận xét cho từng câu trả lời.',
    href: '/interview-practice',
    action: 'Bắt đầu luyện tập',
    icon: MessagesSquare,
    preview: (
      <div className="space-y-2 text-xs">
        <p className="w-fit max-w-full rounded-card rounded-tl-none bg-surface-strong px-3 py-2 text-foreground">
          Kể về một dự án bạn tự hào nhất?
        </p>
        <p className="ml-auto w-fit max-w-full rounded-card rounded-tr-none bg-primary px-3 py-2 text-primary-foreground">
          Em làm đồ án quản lý thư viện bằng React...
        </p>
      </div>
    ),
  },
  {
    title: 'Biết trước quy trình tuyển',
    body: 'Mỗi tin ghi rõ các vòng tuyển và lưu ý của công ty. Sau khi nộp, bạn biết hồ sơ đang ở vòng nào.',
    href: '/applications',
    action: 'Xem việc đã ứng tuyển',
    icon: ListChecks,
    preview: (
      <ol className="flex items-center gap-1.5 text-xs font-medium">
        {['CV', 'Test', 'Phỏng vấn', 'Offer'].map((step, index) => (
          <li key={step} className="flex flex-1 items-center gap-1.5">
            <span
              className={
                index < 2
                  ? 'flex-1 rounded-full bg-success-subtle px-2 py-1 text-center text-success'
                  : index === 2
                    ? 'flex-1 rounded-full bg-primary px-2 py-1 text-center text-primary-foreground'
                    : 'flex-1 rounded-full bg-surface-strong px-2 py-1 text-center text-subtle-foreground'
              }
            >
              {step}
            </span>
          </li>
        ))}
      </ol>
    ),
  },
];

/** Three tools candidates use around an application, each with a still of its own UI. */
export function FeatureGrid() {
  return (
    <section aria-labelledby="features-title" className="bg-surface">
      <div className="mx-auto w-full max-w-page space-y-10 px-4 py-16 md:px-8 lg:py-20">
        <div className="max-w-2xl space-y-2">
          <h2
            id="features-title"
            className="font-display text-3xl font-bold tracking-tight text-foreground"
          >
            Chuẩn bị kỹ trước khi nộp hồ sơ
          </h2>
          <p className="text-muted-foreground">
            Ba công cụ đi cùng bạn từ lúc đọc tin tuyển dụng đến buổi phỏng vấn.
          </p>
        </div>

        <ul className="grid gap-6 md:grid-cols-3">
          {features.map(({ title, body, href, action, icon: Icon, preview }) => (
            <li key={href}>
              <Link
                href={href}
                className="group flex h-full flex-col gap-5 rounded-card bg-surface-muted p-6 transition-all hover:shadow-card-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-safe:hover:-translate-y-0.5"
              >
                <span className="flex size-11 items-center justify-center rounded-control bg-primary-subtle text-primary-subtle-foreground">
                  <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                </span>
                <div className="space-y-2">
                  <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
                </div>
                <div aria-hidden className="mt-auto rounded-card bg-surface p-4 shadow-card">
                  {preview}
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  {action}
                  <ArrowRight
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                    strokeWidth={2}
                    aria-hidden
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
