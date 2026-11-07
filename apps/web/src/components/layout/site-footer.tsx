import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { BrandLogo } from '@/components/layout/brand-logo';

type FooterLink = { label: string; href?: string };

const columns: Array<{ title: string; links: FooterLink[] }> = [
  {
    title: 'Tính năng đột phá',
    links: [
      { label: 'Khám phá việc làm Fresher & Intern', href: '/jobs' },
      { label: 'Phân tích & tối ưu hóa CV bằng AI', href: '/cv-review' },
      { label: 'Phòng luyện phỏng vấn giả lập AI', href: '/interview-practice' },
      { label: 'Theo dõi hồ sơ ứng tuyển', href: '/applications' },
    ],
  },
  {
    title: 'Dành cho ứng viên',
    links: [
      { label: 'Cẩm nang vượt qua vòng sơ tuyển' },
      { label: 'Tiêu chuẩn đánh giá kỹ năng chuẩn hóa' },
      { label: 'Báo cáo mức lương khởi điểm theo ngành' },
      { label: 'Hỗ trợ sinh viên tốt nghiệp' },
    ],
  },
];

const legalLinks = ['Chính sách bảo mật', 'Điều khoản dịch vụ', 'Quy chế bảo vệ dữ liệu'];

export function SiteFooter() {
  return (
    <footer className="w-full bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
        <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <BrandLogo />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Nền tảng việc làm ứng dụng AI hỗ trợ định hướng, phỏng vấn thử và kết nối cơ hội việc
              làm chuẩn xác cho thế hệ tài năng trẻ.
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h2 className="mb-4 font-display text-sm font-semibold">{column.title}</h2>
              <ul className="space-y-2 text-xs text-muted-foreground">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.href ? (
                      <Link href={link.href} className="transition-colors hover:text-primary">
                        {link.label}
                      </Link>
                    ) : (
                      <span>{link.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h2 className="mb-4 font-display text-sm font-semibold">Cam kết pháp lý & bảo mật</h2>
            <div className="space-y-1 rounded-card bg-surface-muted p-4">
              <div className="flex items-center gap-1 font-display text-sm font-semibold text-success">
                <ShieldCheck className="size-4" strokeWidth={1.75} aria-hidden />
                Bảo vệ dữ liệu cá nhân
              </div>
              <p className="text-xs text-muted-foreground">
                Minh bạch quy trình tuyển dụng và mã hóa thông tin theo Nghị định 13/2023/NĐ-CP.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 pt-6 text-xs text-subtle-foreground md:flex-row">
          <p>© {new Date().getFullYear()} Launchly. Bảo lưu mọi quyền.</p>
          <div className="flex items-center gap-6">
            {legalLinks.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
