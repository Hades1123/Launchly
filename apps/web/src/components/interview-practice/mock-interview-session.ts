/*
 * Static demo data for the AI mock interview screen (Stitch: "Mô phỏng Phỏng vấn AI theo Dữ
 * liệu Thật Doanh nghiệp"). There is no interview API yet; when it lands, replace this file
 * with a Zod schema in @launchly/shared and fetch from the API instead of hand-written types.
 */

/** Inline rich text: plain strings, `code` spans and `strong` emphasis. */
export type RichSegment = string | { code: string } | { strong: string };

export type StarPillar = {
  letter: 'S' | 'T' | 'A' | 'R';
  title: string;
  score: number;
  verdict: string;
  tone: 'success' | 'primary' | 'warning';
  note: RichSegment[];
};

export type InterviewSession = {
  role: string;
  company: string;
  questionBankSize: number;
  anonymisedCandidates: number;
  round: string;
  level: string;
  currentQuestion: number;
  totalQuestions: number;
  nextQuestionTopic: string;
  secondsLeft: number;
  secondsTotal: number;
  interviewer: { name: string; badge: string };
  candidate: { name: string; initials: string };
  question: { sentAt: string; text: RichSegment[]; audioLength: string; waveform: number[] };
  answer: {
    sentAt: string;
    text: RichSegment[];
    recordingLength: string;
    clarity: number;
  };
  feedback: {
    score: number;
    verdict: string;
    headline: string;
    summary: string;
    percentile: string;
    pillars: StarPillar[];
    keywords: string[];
    goldenResponse: { source: string; text: RichSegment[] };
  };
};

export const interviewSession: InterviewSession = {
  role: 'Fresher Frontend Engineer',
  company: 'VinTech Solutions',
  questionBankSize: 18,
  anonymisedCandidates: 12,
  round: 'Vòng 3: Kỹ thuật & tư duy',
  level: 'Fresher chuẩn',
  currentQuestion: 2,
  totalQuestions: 5,
  nextQuestionTopic: 'Câu 3 - Quản lý state với Zustand/Redux Toolkit',
  secondsLeft: 165,
  secondsTotal: 240,
  interviewer: { name: 'Alex · Senior Frontend Mentor AI', badge: 'Giọng nói AI' },
  candidate: { name: 'Nguyễn Minh Anh', initials: 'MA' },
  question: {
    sentAt: '10:14',
    text: [
      'Chào Minh Anh! Trong dự án thương mại điện tử Next.js bạn đã làm, khi gặp lỗi render không đồng bộ giữa Server và Client (',
      { strong: 'Hydration Error' },
      '), bạn đã điều tra nguyên nhân gốc rễ và xử lý như thế nào? Hãy trình bày chi tiết các bước bạn thực hiện.',
    ],
    audioLength: '00:16',
    waveform: [2, 4, 5, 3, 4, 2, 5, 3, 2, 4, 5, 3, 2, 4, 5, 3],
  },
  answer: {
    sentAt: '10:16',
    text: [
      '"Trong module giỏ hàng, khi người dùng reload trang, console báo lỗi hydration mismatch vì component đọc trực tiếp ',
      { code: 'localStorage' },
      ' lúc render trên server. Em so sánh HTML server với client và thấy khác nhau. Em chuyển việc đọc ',
      { code: 'localStorage' },
      ' vào ',
      { code: 'useEffect' },
      ' và dùng cờ ',
      { code: 'isMounted' },
      ' trước khi render số lượng giỏ hàng. Với component phụ thuộc giờ hệ thống, em dùng ',
      { code: 'suppressHydrationWarning' },
      ' hoặc ',
      { code: 'next/dynamic' },
      ' với ',
      { code: 'ssr: false' },
      '."',
    ],
    recordingLength: '01:18',
    clarity: 98,
  },
  feedback: {
    score: 8.5,
    verdict: 'Đạt tiêu chuẩn Fresher',
    headline: 'Tư duy gỡ lỗi (debugging) tốt!',
    summary:
      'Ứng viên nắm vững nguyên lý hoạt động của Next.js SSR/CSR và cách cô lập lỗi render hydration.',
    percentile: 'Top 15% câu trả lời Fresher cùng đợt',
    pillars: [
      {
        letter: 'S',
        title: 'Situation (Bối cảnh)',
        score: 9.0,
        verdict: 'Rõ ràng',
        tone: 'success',
        note: [
          'Nêu đúng ngữ cảnh đồ án giỏ hàng thực tế, chỉ ra điểm nghẽn ',
          { code: 'localStorage' },
          ' trên server.',
        ],
      },
      {
        letter: 'T',
        title: 'Task (Nhiệm vụ & mục tiêu)',
        score: 8.5,
        verdict: 'Chính xác',
        tone: 'success',
        note: ['Xác định mục tiêu loại bỏ cảnh báo console và ngăn UI giật layout khi tải trang.'],
      },
      {
        letter: 'A',
        title: 'Action (Hành động cụ thể)',
        score: 8.0,
        verdict: 'Khá',
        tone: 'primary',
        note: [
          'Dùng ',
          { code: 'useEffect' },
          ' kiểm soát lifecycle, áp dụng dynamic import kèm kiểm tra thẻ HTML lồng nhau.',
        ],
      },
      {
        letter: 'R',
        title: 'Result (Kết quả & đo lường)',
        score: 7.0,
        verdict: 'Cần cải thiện',
        tone: 'warning',
        note: [
          'Nên bổ sung số liệu định lượng: console sạch cảnh báo, thời gian tải trang và phản hồi giỏ hàng.',
        ],
      },
    ],
    keywords: [
      'useEffect Lifecycle',
      'suppressHydrationWarning',
      'Dynamic Import (ssr: false)',
      'Browser-only API',
    ],
    goldenResponse: {
      source: 'VinTech Senior Verified',
      text: [
        '"Khi gặp hydration error, em mở React DevTools so sánh DOM snapshot. Để xử lý triệt để, em tách logic trình duyệt vào custom hook ',
        { code: 'useHasMounted()' },
        ', dùng dynamic import cho CartDrawer để giảm initial bundle, và cấu hình fallback skeleton để giữ Core Web Vitals (CLS < 0.05)."',
      ],
    },
  },
};
