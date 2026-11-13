export const JOB_LEVELS = ['INTERN', 'FRESHER', 'JUNIOR'] as const;
export type JobLevel = (typeof JOB_LEVELS)[number];

export const JOB_INDUSTRIES = [
  'Technology',
  'Design',
  'Marketing',
  'Finance',
  'Human Resources',
  'Sales',
  'Customer Service',
  'Operations',
] as const;
export type JobIndustry = (typeof JOB_INDUSTRIES)[number];

export const JOB_LOCATIONS = ['Ho Chi Minh City', 'Ha Noi', 'Da Nang', 'Remote'] as const;
export type JobLocation = (typeof JOB_LOCATIONS)[number];
