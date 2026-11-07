/*
 * Static demo data for the CV review screen (Stitch: "AI Đánh giá CV & Phân tích Độ phù hợp
 * JD"). There is no CV analysis API yet; when it lands, replace this file with a Zod schema in
 * @launchly/shared and fetch from the API instead of hand-written types.
 */

export type MatchedSkill = {
  skill: string;
  matchLabel: string;
  weight: number;
  evidence: string;
};

export type SkillGap = {
  skill: string;
  priority: 'required' | 'nice-to-have';
  jdRequirement: string;
  currentState: string;
  quickFix: string;
  resourceLabel?: string;
};

export type ActionTip = {
  title: string;
  impact: string;
  body: string;
  cta: string;
};

export type CvReview = {
  jobId: string;
  cvFile: { name: string; meta: string };
  analysisSeconds: number;
  score: number;
  verdict: string;
  tier: string;
  model: string;
  requirementCount: number;
  summary: {
    matched: { count: number; total: number; note: string };
    gaps: { count: number; note: string };
    passRate: { percent: number; note: string };
  };
  benchmark: { headline: string; detail: string };
  matchedSkills: MatchedSkill[];
  gaps: SkillGap[];
  targetScore: number;
  expectedGain: number;
  tips: ActionTip[];
};

export const cvReview: CvReview = {
  jobId: 'vintech-fresher-frontend',
  cvFile: { name: 'Nguyen_Minh_Anh_Frontend_CV_2026.pdf', meta: 'PDF • 1.2 MB • Vừa tải lên' },
  analysisSeconds: 18,
  score: 84,
  verdict: 'Rất phù hợp',
  tier: 'Tier 1 Fresher',
  model: 'Semantic JD Alignment',
  requirementCount: 14,
  summary: {
    matched: {
      count: 8,
      total: 10,
      note: 'Đáp ứng trọn vẹn nhóm nền tảng cốt lõi HTML, CSS, JS, Next.js.',
    },
    gaps: {
      count: 2,
      note: 'Gồm 1 yêu cầu bắt buộc (State Management) và 1 yêu cầu nên có (Unit Test).',
    },
    passRate: {
      percent: 89,
      note: 'Khả năng lọt danh sách phỏng vấn trực tiếp từ nhà tuyển dụng.',
    },
  },
  benchmark: {
    headline: 'Bạn đang dẫn đầu nhóm 15% ứng viên Fresher nộp hồ sơ tuần này',
    detail: 'Điểm trung bình của vị trí Frontend Engineer tại VinTech là 71/100.',
  },
  matchedSkills: [
    {
      skill: 'React & Next.js',
      matchLabel: 'Khớp hoàn hảo (100%)',
      weight: 30,
      evidence:
        'Đồ án Mini E-commerce Platform xây dựng bằng Next.js (App Router), Server Components và Server Actions trong mục "Dự án tiêu biểu".',
    },
    {
      skill: 'TypeScript & JavaScript ES6+',
      matchLabel: 'Khớp (95%)',
      weight: 25,
      evidence:
        'Chứng chỉ JavaScript ES6+ cùng thực hành Generics và Utility Types trên repository cá nhân.',
    },
    {
      skill: 'Tailwind CSS & Responsive UI',
      matchLabel: 'Khớp (90%)',
      weight: 20,
      evidence:
        '3 dự án cá nhân thiết kế responsive đa màn hình với Tailwind CSS, có hỗ trợ Dark Mode.',
    },
    {
      skill: 'Tư duy Git / GitHub',
      matchLabel: 'Khớp (88%)',
      weight: 10,
      evidence:
        'Đính kèm liên kết GitHub hoạt động đều đặn với lịch sử commit theo Conventional Commits.',
    },
  ],
  gaps: [
    {
      skill: 'State Management (Redux Toolkit / Zustand)',
      priority: 'required',
      jdRequirement: 'Có kinh nghiệm xử lý state toàn cục',
      currentState:
        'CV hiện chỉ nhắc đến React Context API cơ bản, chưa thể hiện khả năng tối ưu render trong ứng dụng thương mại điện tử lớn.',
      quickFix:
        'Tạo thêm module Giỏ hàng & Thanh toán bằng Zustand, đưa vào repo và bổ sung 1 gạch đầu dòng cụ thể trong CV.',
      resourceLabel: 'Xem mẫu mô tả Zustand chuẩn ATS',
    },
    {
      skill: 'Viết Unit Test (Jest / React Testing Library)',
      priority: 'nice-to-have',
      jdRequirement: 'Hiểu biết về kiểm thử tự động',
      currentState:
        'Chưa thấy từ khóa kiểm thử trong toàn bộ nội dung CV và danh sách kỹ năng chuyên môn.',
      quickFix:
        'Viết test case cơ bản cho 2 UI component (nút bấm, form nhập liệu) bằng React Testing Library và cập nhật: "Áp dụng Jest & RTL đảm bảo độ ổn định mã nguồn".',
    },
  ],
  targetScore: 95,
  expectedGain: 11,
  tips: [
    {
      title: 'Chuẩn hóa dự án theo công thức STAR',
      impact: '+5 điểm tác động',
      body: 'Viết lại mô tả đồ án tốt nghiệp theo STAR: Tình huống - Nhiệm vụ - Hành động kỹ thuật - Kết quả đo lường (ví dụ: "tối ưu FCP dưới 1.2s, xử lý 100+ danh mục hàng hóa").',
      cta: 'Xem câu gợi ý do AI viết sẵn',
    },
    {
      title: 'Đính kèm link live demo',
      impact: '+4 điểm minh chứng',
      body: 'Bổ sung đường dẫn deploy của dự án e-commerce để nhà tuyển dụng click xem tương tác thực tế ngay trên bản CV PDF.',
      cta: 'Hướng dẫn gắn link ATS an toàn',
    },
    {
      title: 'Làm nổi bật khả năng đọc tài liệu tiếng Anh',
      impact: '+2 điểm thái độ',
      body: 'Nhấn mạnh kỹ năng tự tìm hiểu tài liệu tiếng Anh (Next.js docs, RFC) trong phần giới thiệu ngắn để đáp ứng tiêu chí môi trường quốc tế.',
      cta: 'Áp dụng mẫu Summary',
    },
  ],
};
