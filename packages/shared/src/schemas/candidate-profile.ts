import { z } from 'zod';

export const resumeSchema = z.object({
  id: z.string().uuid(),
  candidateId: z.string().uuid(),
  fileName: z.string(),
  contentType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ResumeDto = z.infer<typeof resumeSchema>;

export const candidateProfileSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  fullName: z.string().min(1),
  headline: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  schoolMajor: z.string().nullable().optional(),
  skills: z.array(z.string()).default([]),
  projectsActivities: z.string().nullable().optional(),
  resumes: z.array(resumeSchema).default([]),
  cvOriginalFileName: z.string().nullable().optional(),
  cvUploadedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CandidateProfile = z.infer<typeof candidateProfileSchema>;

export const updateCandidateProfileSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name cannot be empty'),
  headline: z.string().trim().max(255).optional().nullable(),
  bio: z.string().trim().max(5000).optional().nullable(),
  location: z.string().trim().max(255).optional().nullable(),
  schoolMajor: z.string().trim().max(255).optional().nullable(),
  skills: z.array(z.string().trim().min(1)).default([]),
  projectsActivities: z.string().trim().max(5000).optional().nullable(),
});

export type UpdateCandidateProfileInput = z.infer<typeof updateCandidateProfileSchema>;

export const cvMetadataSchema = z.object({
  id: z.string().uuid().optional(),
  originalFileName: z.string(),
  fileSize: z.number().int().nonnegative().optional(),
  uploadedAt: z.string(),
});

export type CvMetadata = z.infer<typeof cvMetadataSchema>;
