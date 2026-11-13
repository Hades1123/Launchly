const steps = [
  {
    title: 'Tạo hồ sơ và tải CV',
    body: 'Điền thông tin cơ bản, tải CV dạng PDF một lần và dùng lại cho mọi lần ứng tuyển.',
  },
  {
    title: 'Tìm việc và kiểm tra CV',
    body: 'Lọc theo cấp bậc, ngành và địa điểm. Kiểm tra CV với tin bạn thích trước khi nộp.',
  },
  {
    title: 'Ứng tuyển và theo dõi',
    body: 'Nộp hồ sơ ngay trên tin tuyển dụng và xem trạng thái của từng đơn trong một trang.',
  },
];

/** Three numbered steps from sign-up to a tracked application. */
export function HowItWorks() {
  return (
    <section aria-labelledby="how-title" className="bg-background">
      <div className="mx-auto grid w-full max-w-page gap-10 px-4 py-16 md:px-8 lg:grid-cols-12 lg:py-20">
        <div className="space-y-2 lg:col-span-4">
          <h2
            id="how-title"
            className="font-display text-3xl font-bold tracking-tight text-foreground"
          >
            Ba bước tới công việc đầu tiên
          </h2>
          <p className="text-muted-foreground">
            Không cần kinh nghiệm dày. Một bản CV và vài phút là đủ để bắt đầu.
          </p>
        </div>

        <ol className="grid gap-6 sm:grid-cols-3 lg:col-span-8">
          {steps.map((step, index) => (
            <li key={step.title} className="space-y-3">
              <span className="block font-display text-5xl font-bold text-primary-subtle-foreground/25">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="font-display text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
