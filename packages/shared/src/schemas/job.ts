import { z } from 'zod';

export const jobLevelSchema = z.enum([
  'INTERN',
  'FRESHER',
  'SENIOR',
]);

export const jobIdParamsSchema = z.object({
  id: z.string().uuid('Mã tin tuyển dụng không hợp lệ'),
});

export const resubmitJobSchema = z.object({
  title: z.string().min(5, 'Tiêu đề phải có ít nhất 5 ký tự').max(200),
  description: z.string().min(20, 'Mô tả công việc phải có ít nhất 20 ký tự'),
  level: jobLevelSchema,
  location: z.string().min(2, 'Địa điểm làm việc không được để trống'),
  requirements: z.array(z.string().min(1)).min(1, 'Cần ít nhất một yêu cầu công việc'),
  benefits: z.array(z.string().min(1)).default([]),
  salaryMin: z.number().positive().nullable().optional(),
  salaryMax: z.number().positive().nullable().optional(),
}).refine(
  (data) => {
    if (data.salaryMin && data.salaryMax) {
      return data.salaryMax >= data.salaryMin;
    }
    return true;
  },
  {
    message: 'Mức lương tối đa phải lớn hơn hoặc bằng mức lương tối thiểu',
    path: ['salaryMax'],
  }
);

export type JobLevel = z.infer<typeof jobLevelSchema>;
export type JobIdParams = z.infer<typeof jobIdParamsSchema>;
export type ResubmitJobInput = z.infer<typeof resubmitJobSchema>;