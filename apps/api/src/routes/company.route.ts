import { Router, Request, Response } from 'express';

const router = Router();

// Mảng giả lập Database lưu tạm trong RAM
const mockCompanies: any[] = [
  {
    id: 'demo-company',
    ownerId: 'other-recruiter-id', // Đổi để không trùng với tài khoản bạn đang test
    name: '123ABC',
    address: 'DI AN TPHCM',
    industry: 'Thương mại điện tử',
    companySize: '51 - 200 nhân viên',
    website: 'https://google.com', // Đổi link thật để test bấm nút mở web
    logoUrl: '',
    description: 'Công ty công nghệ chuyên cung cấp giải pháp tuyển dụng thông minh và kết nối nhân tài.',
    status: 'APPROVED',
  },
];

const getRecruiterId = (req: Request): string => {
  return (req.headers['x-user-id'] as string) || 'recruiter-mock-id';
};

// 1. POST /api/companies: Đăng ký công ty mới
router.post('/companies', async (req: Request, res: Response) => {
  try {
    const ownerId = getRecruiterId(req);
    const { name, address, industry, companySize, website, logoUrl, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Company name is required.' });
    }
    if (!address || !address.trim()) {
      return res.status(400).json({ error: 'Company address is required.' });
    }

    const existing = mockCompanies.find((c) => c.ownerId === ownerId);
    if (existing) {
      return res.status(409).json({
        code: 'COMPANY_EXISTS',
        error: 'You already have a registered company.',
      });
    }

    const newCompany = {
      id: 'comp_' + Date.now(),
      ownerId,
      name: name.trim(),
      address: address.trim(),
      industry: industry || 'IT / Software',
      companySize: companySize || '1-50',
      website: website || '',
      logoUrl: logoUrl || '',
      description: description || '',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    mockCompanies.push(newCompany);

    return res.status(201).json({
      message: 'Company registration submitted. Status is Pending.',
      data: newCompany,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. GET /api/companies/me: Xem công ty của tôi
router.get('/companies/me', async (req: Request, res: Response) => {
  const ownerId = getRecruiterId(req);
  const company = mockCompanies.find((c) => c.ownerId === ownerId);

  if (!company) {
    return res.status(404).json({ error: 'Company profile not found.' });
  }
  return res.status(200).json(company);
});

// 3. GET /api/companies/:id: Public xem chi tiết
router.get('/companies/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const company = mockCompanies.find((c) => c.id === id);

  if (!company || company.status !== 'APPROVED') {
    return res.status(404).json({
      error: 'Company not found or pending verification.',
    });
  }
  return res.status(200).json(company);
});

export default router;