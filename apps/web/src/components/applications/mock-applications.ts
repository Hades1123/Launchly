/*
 * Static demo data for the application tracking screen (Stitch: "Theo dõi Hồ sơ Ứng tuyển &
 * Lịch Phỏng vấn Minh bạch"). There is no applications API yet; when it lands, replace this
 * file with Zod schemas in @launchly/shared and fetch from the API instead of hand-written types.
 */
import { jobs, type CareerLevel } from '@/components/jobs/mock-jobs';

export type StageStatus = 'completed' | 'current' | 'pending';

export type ApplicationStage = {
  title: string;
  /** Actual date for finished stages, expected date for pending ones. */
  date: string;
  status: StageStatus;
  resultLabel?: string;
  note?: string;
  /** Only for the current stage when an appointment is booked. */
  appointment?: { time: string; channel: string; interviewers: string };
};

export type StatusTone = 'primary' | 'warning' | 'success';
export type StatusIcon = 'viewed' | 'grading' | 'submitted' | 'interview';

export type Application = {
  id: string;
  company: string;
  companyInitials: string;
  role: string;
  level: CareerLevel;
  location: string;
  /** Links back to the job on /jobs when the posting is in the demo job list. */
  jobId?: string;
  matchScore: number;
  currentStageLabel: string;
  stages: ApplicationStage[];
  status: {
    tone: StatusTone;
    icon: StatusIcon;
    text: string;
    detailLabel: string;
    detailValue: string;
  };
  footnote: string;
  checklist?: Array<{ label: string; done: boolean }>;
  mockQuestionCount?: number;
};

export type ArchivedFeedback = {
  company: string;
  companyInitials: string;
  role: string;
  closedAgo: string;
  strengths: string;
  improvements: string;
};

function fromJob(id: string) {
  const job = jobs.find((item) => item.id === id);
  if (!job) throw new Error(`Unknown demo job: ${id}`);
  return {
    jobId: job.id,
    company: job.company,
    companyInitials: job.companyInitials,
    role: job.shortTitle,
    level: job.level,
  };
}

export const candidate = {
  name: 'Nguyễn Minh Anh',
  profileId: '#VN-8842-AP',
  lastSync: '10:15 hôm nay',
};

export const overviewMetrics = {
  interviews: { value: '01', note: 'Sắp tới (10/11)' },
  cvViewed: { value: '01', note: '2 giờ trước' },
  testsGrading: { value: '02', note: 'Trong 24-48h' },
  responseSpeed: { value: '94%', note: 'Nhanh hơn trung bình' },
};

export const applications: Application[] = [
  {
    id: 'vintech-frontend',
    ...fromJob('vintech-fresher-frontend'),
    location: 'Quận 1, TP. HCM (Hybrid)',
    matchScore: 94,
    currentStageLabel: 'Vòng 3: Phỏng vấn kỹ thuật',
    stages: [
      {
        title: 'Vòng 1: Lọc hồ sơ & CV AI Matching',
        date: '02/11/2026',
        status: 'completed',
        resultLabel: 'Đã duyệt',
        note: 'Đánh giá sơ bộ: CV xuất sắc (điểm tương thích JD 94%)',
      },
      {
        title: 'Vòng 2: Test thuật toán & coding sandbox',
        date: '04/11/2026',
        status: 'completed',
        resultLabel: 'Hoàn thành',
        note: 'Điểm số đạt 88/100 (top 10% ứng viên cùng đợt)',
      },
      {
        title: 'Vòng 3: Phỏng vấn kỹ thuật với Tech Lead',
        date: '10/11/2026',
        status: 'current',
        appointment: {
          time: '14:30 - 15:30 · Thứ Ba, 10/11/2026',
          channel: 'Google Meet (link gửi qua email)',
          interviewers:
            'Trần Quốc Bảo (Principal Frontend Architect) và Lead Recruiter. Trọng tâm: tư duy component design, SSR và khả năng debug thực tế.',
        },
      },
      {
        title: 'Vòng 4: Phỏng vấn văn hóa & trao đổi offer',
        date: 'Dự kiến 13/11/2026',
        status: 'pending',
        note: 'Mở khóa sau khi vượt qua vòng phỏng vấn kỹ thuật.',
      },
    ],
    status: {
      tone: 'primary',
      icon: 'interview',
      text: 'Lịch phỏng vấn vòng 3 đã xác định',
      detailLabel: 'Thời gian:',
      detailValue: '14:30, 10/11/2026',
    },
    footnote: 'Độ khớp CV: 94%',
    checklist: [
      { label: 'Chuẩn bị mã nguồn dự án tốt nghiệp & portfolio trên GitHub', done: true },
      { label: 'Kiểm tra đường truyền Internet, webcam & micro trước 15 phút', done: false },
      { label: 'Ôn lại cơ chế hydration trong Next.js và global store với Zustand', done: false },
    ],
    mockQuestionCount: 5,
  },
  {
    id: 'paynext-fullstack',
    ...fromJob('paynext-junior-fullstack'),
    location: 'Cầu Giấy, Hà Nội (Hybrid)',
    matchScore: 89,
    currentStageLabel: 'Vòng 1: Sàng lọc hồ sơ',
    stages: [
      {
        title: 'Vòng 1: Sàng lọc hồ sơ',
        date: '06/11/2026',
        status: 'current',
        note: 'HR đã mở hồ sơ của bạn 2 giờ trước.',
      },
      {
        title: 'Vòng 2: Bài tập về nhà',
        date: 'Dự kiến 09/11/2026',
        status: 'pending',
      },
      {
        title: 'Vòng 3: Phỏng vấn kỹ thuật',
        date: 'Dự kiến 13/11/2026',
        status: 'pending',
      },
      {
        title: 'Vòng 4: Gặp Engineering Manager',
        date: 'Dự kiến 17/11/2026',
        status: 'pending',
      },
    ],
    status: {
      tone: 'primary',
      icon: 'viewed',
      text: 'HR đã xem hồ sơ 2 giờ trước',
      detailLabel: 'Dự kiến phản hồi:',
      detailValue: 'Trong 1 ngày làm việc',
    },
    footnote: 'Độ khớp CV: 89%',
    mockQuestionCount: 4,
  },
  {
    id: 'kms-data-analyst',
    ...fromJob('kms-fresher-data-analyst'),
    location: 'Bình Thạnh, TP. HCM',
    matchScore: 82,
    currentStageLabel: 'Vòng 2: Bài test SQL',
    stages: [
      {
        title: 'Vòng 1: Lọc hồ sơ',
        date: '01/11/2026',
        status: 'completed',
        resultLabel: 'Đã duyệt',
      },
      {
        title: 'Vòng 2: Bài test SQL',
        date: '05/11/2026',
        status: 'current',
        note: 'Bài làm đã nộp, đang được chấm tự động.',
      },
      { title: 'Vòng 3: Case study', date: 'Dự kiến 12/11/2026', status: 'pending' },
      { title: 'Vòng 4: Phỏng vấn HR', date: 'Dự kiến 16/11/2026', status: 'pending' },
    ],
    status: {
      tone: 'warning',
      icon: 'grading',
      text: 'Đang chấm kết quả bài test',
      detailLabel: 'Hệ thống chấm:',
      detailValue: 'HackerRank Benchmark',
    },
    footnote: 'Nộp ngày: 01/11/2026',
    mockQuestionCount: 3,
  },
  {
    id: 'novacommerce-qa-intern',
    company: 'NovaCommerce',
    companyInitials: 'NC',
    role: 'QA / Tester Intern',
    level: 'Intern',
    location: 'Quận 7, TP. HCM',
    matchScore: 76,
    currentStageLabel: 'Chờ xếp lịch test đầu vào',
    stages: [
      {
        title: 'Vòng 1: Nộp hồ sơ',
        date: '06/11/2026',
        status: 'current',
        note: 'Hồ sơ đã nộp thành công, đang chờ xếp lịch test đầu vào.',
      },
      { title: 'Vòng 2: Test đầu vào', date: 'Dự kiến 14/11/2026', status: 'pending' },
      { title: 'Vòng 3: Phỏng vấn mentor', date: 'Dự kiến 20/11/2026', status: 'pending' },
    ],
    status: {
      tone: 'success',
      icon: 'submitted',
      text: 'Hồ sơ đã nộp thành công',
      detailLabel: 'Đợt tuyển:',
      detailValue: 'Khóa tháng 11',
    },
    footnote: 'Chờ xếp lịch test đầu vào',
  },
];

export const archivedFeedback: ArchivedFeedback = {
  company: 'FinBridge',
  companyInitials: 'FB',
  role: 'Junior Frontend Developer',
  closedAgo: 'Đã đóng hồ sơ 2 tuần trước',
  strengths:
    'Minh Anh có kiến thức nền tảng HTML/CSS và TypeScript rất vững, giao tiếp tự tin và thái độ học hỏi cởi mở.',
  improvements:
    'Cần thêm kinh nghiệm xử lý state đồng bộ khi tải nhiều luồng dữ liệu (race condition). Nên thực hành thêm các bài toán web performance và virtualized list.',
};

export function findApplication(id: string | undefined): Application {
  return applications.find((item) => item.id === id) ?? applications[0]!;
}
