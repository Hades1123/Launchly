/*
 * Static demo data for the job discovery screen (Stitch: "Khám phá Việc làm & Quy trình
 * Tuyển dụng Minh bạch"). There is no jobs API yet; when it lands, replace this file with a
 * Zod schema in @launchly/shared and fetch from the API instead of hand-written types.
 */

export type CareerLevel = 'Intern' | 'Fresher' | 'Junior';

export type HiringStep = {
  title: string;
  format: string;
  description: string;
  duration: string;
};

export type Job = {
  id: string;
  title: string;
  shortTitle: string;
  company: string;
  companyInitials: string;
  level: CareerLevel;
  district: string;
  address: string;
  schedule: string;
  salaryRange: string;
  salaryShort: string;
  matchScore: number;
  tags: Array<{ label: string; tone: 'neutral' | 'success' | 'primary' }>;
  transparency: {
    responseTime: string;
    responseTimeNote: string;
    responseRate: string;
    verified: boolean;
    rating: number;
    ratingCount: number;
  };
  processDuration: string;
  steps: HiringStep[];
  tips: Array<{ title: string; body: string }>;
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];
  benefits: Array<{ title: string; body: string }>;
  deadline: string;
  daysLeft: number;
};

export const jobs: Job[] = [
  {
    id: 'vintech-fresher-frontend',
    title: 'Fresher Frontend Engineer (React/TypeScript)',
    shortTitle: 'Fresher Frontend Engineer',
    company: 'VinTech Solutions',
    companyInitials: 'VT',
    level: 'Fresher',
    district: 'Quận 1, TP.HCM',
    address: 'Tầng 14, Tòa nhà Bitexco, Quận 1, TP. Hồ Chí Minh',
    schedule: 'Toàn thời gian (Thứ 2 - Thứ 6)',
    salaryRange: '10.000.000 - 14.000.000 VNĐ',
    salaryShort: '10 - 14 triệu',
    matchScore: 88,
    tags: [
      { label: 'React / TS', tone: 'neutral' },
      { label: 'Có mentor kèm cặp', tone: 'success' },
      { label: 'Quy trình 4 vòng', tone: 'primary' },
    ],
    transparency: {
      responseTime: '48 giờ',
      responseTimeNote: 'Nhanh hơn 85% thị trường',
      responseRate: '98.4%',
      verified: true,
      rating: 4.8,
      ratingCount: 42,
    },
    processDuration: '~12-14 ngày',
    steps: [
      {
        title: 'Lọc CV & hồ sơ dự án',
        format: 'Online',
        description: 'AI trích xuất kỹ năng lập trình và phân tích dự án GitHub/portfolio.',
        duration: '2-3 ngày làm việc',
      },
      {
        title: 'Test thuật toán & mini code',
        format: 'Codility',
        description:
          '2 bài thuật toán cơ bản (Array/Object) và 1 bài thực hành cấu trúc component React.',
        duration: '60 phút trực tuyến',
      },
      {
        title: 'Phỏng vấn Tech Lead',
        format: 'Google Meet',
        description:
          'Live code review đồ án của bạn, trao đổi giải pháp tối ưu và tư duy phát triển.',
        duration: '45 phút 1-on-1',
      },
      {
        title: 'Văn hóa & thỏa thuận offer',
        format: 'Tại văn phòng',
        description: 'Gặp HR Director trao đổi mức lương chính thức, đãi ngộ và lộ trình 6 tháng.',
        duration: '30 phút trực tiếp',
      },
    ],
    tips: [
      {
        title: 'Host dự án thực tế',
        body: 'Ưu tiên ứng viên có dự án cá nhân hoặc đồ án tốt nghiệp host thực tế trên Vercel, Render hoặc GitHub Pages.',
      },
      {
        title: 'Tư duy clean code',
        body: 'Chú trọng clean code, chia component rành mạch và khả năng tự học giải quyết lỗi hơn là thuộc lòng lý thuyết.',
      },
      {
        title: 'Kỹ năng đọc tài liệu',
        body: 'Đọc hiểu tài liệu kỹ thuật tiếng Anh (MDN, React Docs). Không bắt buộc chứng chỉ IELTS.',
      },
    ],
    responsibilities: [
      'Phát triển hệ thống dashboard phân tích dữ liệu bán lẻ bằng React, TypeScript và Tailwind CSS.',
      'Chuyển bản thiết kế Figma thành giao diện responsive, tối ưu UX cho desktop và di động.',
      'Tích hợp RESTful API và WebSocket thời gian thực cùng đội ngũ Backend.',
      'Được Senior Frontend Lead kèm cặp: code review hằng ngày, học quy trình CI/CD và viết unit test.',
      'Áp dụng kỹ thuật tối ưu tải trang (Core Web Vitals, code splitting, memoization).',
    ],
    requirements: [
      'Nắm vững JavaScript (ES6+), HTML5 ngữ nghĩa và CSS3/Flexbox/Grid.',
      'Đã làm ít nhất 1-2 dự án ReactJS (Hooks, state management cơ bản như Zustand hoặc Context API).',
      'Sử dụng thành thạo Git cơ bản (branch, commit, pull request, merge conflict).',
      'Sinh viên năm cuối hoặc mới tốt nghiệp CNTT/Khoa học máy tính hoặc bootcamp uy tín.',
    ],
    niceToHave: [
      'Có kinh nghiệm thực chiến với TypeScript trên React.',
      'Đã từng cấu hình Tailwind CSS hoặc UI component library (Radix UI, shadcn).',
      'Hiểu biết cơ bản về Next.js hoặc Server-Side Rendering.',
      'Có tài khoản GitHub hoạt động tích cực.',
    ],
    benefits: [
      {
        title: 'Trang thiết bị chuẩn PRO',
        body: 'Cấp MacBook Air ngay ngày đầu nhận việc và màn hình phụ 27 inch 4K tại văn phòng.',
      },
      {
        title: 'Ngân sách học tập',
        body: '5.000.000 VNĐ/năm cho khóa học Udemy/Coursera hoặc sách chuyên ngành.',
      },
      {
        title: 'Phụ cấp & bảo hiểm',
        body: 'Phụ cấp ăn trưa 50.000đ/ngày, gửi xe miễn phí, bảo hiểm sức khỏe cao cấp sau thử việc.',
      },
    ],
    deadline: '30/12/2026',
    daysLeft: 14,
  },
  {
    id: 'paynext-junior-fullstack',
    title: 'Junior Fullstack Developer (Node.js/React)',
    shortTitle: 'Junior Fullstack Developer',
    company: 'PayNext Global',
    companyInitials: 'PN',
    level: 'Junior',
    district: 'Cầu Giấy, Hà Nội',
    address: 'Tòa nhà Discovery, 302 Cầu Giấy, Hà Nội',
    schedule: 'Hybrid (3 ngày văn phòng)',
    salaryRange: '12.000.000 - 18.000.000 VNĐ',
    salaryShort: '12 - 18 triệu',
    matchScore: 79,
    tags: [
      { label: 'Node.js', tone: 'neutral' },
      { label: 'Hybrid', tone: 'neutral' },
      { label: 'Phản hồi 24h', tone: 'primary' },
    ],
    transparency: {
      responseTime: '24 giờ',
      responseTimeNote: 'Nhanh hơn 92% thị trường',
      responseRate: '96.1%',
      verified: true,
      rating: 4.6,
      ratingCount: 31,
    },
    processDuration: '~10 ngày',
    steps: [
      {
        title: 'Sàng lọc hồ sơ',
        format: 'Online',
        description: 'Đánh giá CV và dự án fullstack đã triển khai.',
        duration: '1-2 ngày làm việc',
      },
      {
        title: 'Bài tập về nhà',
        format: 'GitHub',
        description: 'Xây dựng REST API nhỏ với Node.js và một màn hình React tiêu thụ API đó.',
        duration: '3 ngày',
      },
      {
        title: 'Phỏng vấn kỹ thuật',
        format: 'Google Meet',
        description: 'Trình bày bài tập, thảo luận thiết kế cơ sở dữ liệu và bảo mật API.',
        duration: '60 phút',
      },
      {
        title: 'Gặp Engineering Manager',
        format: 'Tại văn phòng',
        description: 'Trao đổi văn hóa nhóm, lộ trình phát triển và offer.',
        duration: '30 phút',
      },
    ],
    tips: [
      {
        title: 'Hiểu luồng thanh toán',
        body: 'Tìm hiểu cơ bản về idempotency và xử lý giao dịch thất bại.',
      },
      {
        title: 'Viết test',
        body: 'Bài tập có test tự động được đánh giá cao hơn bài tập chỉ chạy được.',
      },
      {
        title: 'Giải thích quyết định',
        body: 'Chuẩn bị lý do cho từng lựa chọn công nghệ trong bài tập về nhà.',
      },
    ],
    responsibilities: [
      'Phát triển API thanh toán bằng Node.js và TypeScript.',
      'Xây dựng màn hình quản trị cho đối tác bằng React.',
      'Tham gia on-call cùng mentor và viết tài liệu kỹ thuật.',
    ],
    requirements: [
      '1-2 năm kinh nghiệm với Node.js hoặc một backend framework tương đương.',
      'Hiểu SQL và thiết kế cơ sở dữ liệu quan hệ.',
      'Đã làm việc với React ở mức cơ bản.',
    ],
    niceToHave: [
      'Kinh nghiệm với PostgreSQL và ORM (Prisma, TypeORM).',
      'Hiểu biết về Docker và CI/CD.',
    ],
    benefits: [
      { title: 'Lương tháng 13', body: 'Thưởng tháng 13 và thưởng hiệu suất theo quý.' },
      { title: 'Làm việc hybrid', body: '2 ngày làm việc từ xa mỗi tuần.' },
      { title: 'Bảo hiểm', body: 'Bảo hiểm sức khỏe cho nhân viên và người thân.' },
    ],
    deadline: '15/01/2027',
    daysLeft: 30,
  },
  {
    id: 'kms-fresher-data-analyst',
    title: 'Fresher Data Analyst (SQL/Power BI)',
    shortTitle: 'Fresher Data Analyst',
    company: 'KMS Innovation Hub',
    companyInitials: 'KM',
    level: 'Fresher',
    district: 'Bình Thạnh, TP.HCM',
    address: 'Tòa nhà Pearl Plaza, Bình Thạnh, TP. Hồ Chí Minh',
    schedule: 'Toàn thời gian (Thứ 2 - Thứ 6)',
    salaryRange: '9.000.000 - 13.000.000 VNĐ',
    salaryShort: '9 - 13 triệu',
    matchScore: 82,
    tags: [
      { label: 'SQL / Power BI', tone: 'neutral' },
      { label: 'Cấp MacBook', tone: 'success' },
    ],
    transparency: {
      responseTime: '72 giờ',
      responseTimeNote: 'Nhanh hơn 60% thị trường',
      responseRate: '94.0%',
      verified: true,
      rating: 4.5,
      ratingCount: 18,
    },
    processDuration: '~14 ngày',
    steps: [
      {
        title: 'Lọc hồ sơ',
        format: 'Online',
        description: 'Xem xét CV, bảng điểm và dự án phân tích dữ liệu.',
        duration: '3 ngày làm việc',
      },
      {
        title: 'Bài test SQL',
        format: 'HackerRank',
        description: '5 câu truy vấn SQL từ cơ bản đến JOIN và window function.',
        duration: '45 phút',
      },
      {
        title: 'Case study',
        format: 'Google Meet',
        description: 'Phân tích một bộ dữ liệu bán hàng và trình bày insight.',
        duration: '60 phút',
      },
      {
        title: 'Phỏng vấn HR',
        format: 'Tại văn phòng',
        description: 'Trao đổi văn hóa, mức lương và chương trình đào tạo.',
        duration: '30 phút',
      },
    ],
    tips: [
      { title: 'SQL vững', body: 'JOIN, GROUP BY và window function là trọng tâm của bài test.' },
      {
        title: 'Kể chuyện bằng dữ liệu',
        body: 'Case study chấm điểm cách bạn trình bày insight, không chỉ con số.',
      },
      {
        title: 'Portfolio',
        body: 'Một dashboard Power BI hoặc Tableau công khai là điểm cộng lớn.',
      },
    ],
    responsibilities: [
      'Xây dựng báo cáo và dashboard Power BI cho khối kinh doanh.',
      'Làm sạch và chuẩn hóa dữ liệu từ nhiều nguồn.',
      'Phối hợp với đội sản phẩm để định nghĩa chỉ số theo dõi.',
    ],
    requirements: [
      'Thành thạo SQL cơ bản và Excel.',
      'Tư duy logic và khả năng trình bày rõ ràng.',
      'Tốt nghiệp ngành CNTT, Toán, Thống kê hoặc Kinh tế.',
    ],
    niceToHave: ['Biết Python (pandas) cho phân tích dữ liệu.', 'Có chứng chỉ Power BI PL-300.'],
    benefits: [
      { title: 'Cấp MacBook', body: 'MacBook Pro cho công việc phân tích.' },
      { title: 'Đào tạo', body: 'Chương trình đào tạo Data Analyst 3 tháng đầu.' },
      { title: 'Du lịch', body: 'Du lịch công ty hằng năm.' },
    ],
    deadline: '20/12/2026',
    daysLeft: 9,
  },
];

export function findJob(id: string | undefined): Job {
  return jobs.find((job) => job.id === id) ?? jobs[0]!;
}
