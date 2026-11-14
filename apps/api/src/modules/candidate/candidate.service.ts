import type { Readable } from 'stream';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/app-error';
import { nameFromEmail } from '@/lib/utils';
import { getStorageProvider, type StorageProvider } from '@/providers/storage';
import { validateCvFile } from './cv-validator';
import type { CandidateProfile, UpdateCandidateProfileInput, CvMetadata } from '@launchly/shared';

const withUsageCount = {
  include: { _count: { select: { applications: true, assessments: true } } },
} as const;

type ResumeUsage = { _count: { applications: number; assessments: number } };

/** True while an application or an AI assessment still points at the resume. */
function isReferenced(resume: ResumeUsage): boolean {
  return resume._count.applications + resume._count.assessments > 0;
}

export class CandidateService {
  constructor(private readonly storage: StorageProvider = getStorageProvider()) {}

  /**
   * Retrieves profile for the candidate. Creates a default empty profile if none exists.
   */
  async getProfile(userId: string): Promise<CandidateProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        candidateProfile: {
          include: {
            resumes: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AppError('NOT_FOUND', 'Candidate user not found');
    }

    let profile = user.candidateProfile;
    if (!profile) {
      profile = await prisma.candidateProfile.create({
        data: {
          userId: user.id,
          skills: [],
        },
        include: {
          resumes: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    }

    const latestResume = profile.resumes?.[0];

    return {
      id: profile.id,
      userId: user.id,
      // Registration stores the email local part; older accounts may still have no name.
      fullName: user.fullName ?? nameFromEmail(user.email),
      headline: profile.headline ?? null,
      bio: profile.bio ?? null,
      location: profile.location ?? null,
      schoolMajor: profile.schoolMajor ?? null,
      skills: profile.skills,
      projectsActivities: profile.projectsActivities ?? null,
      aiConsentAcceptedAt: profile.aiConsentAcceptedAt?.toISOString() ?? null,
      resumes: (profile.resumes || []).map((r) => ({
        id: r.id,
        candidateId: r.candidateId,
        fileName: r.fileName,
        contentType: r.contentType,
        sizeBytes: r.sizeBytes,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      cvOriginalFileName: latestResume?.fileName ?? null,
      cvUploadedAt: latestResume ? latestResume.createdAt.toISOString() : null,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    };
  }

  /**
   * Records the candidate's agreement to AI processing of their CV. The first time wins:
   * a repeat call changes nothing, and a concurrent one cannot overwrite the timestamp.
   */
  async acceptAiConsent(userId: string): Promise<CandidateProfile> {
    const profile = await this.getProfile(userId);
    if (profile.aiConsentAcceptedAt) return profile;
    await prisma.candidateProfile.updateMany({
      where: { userId, aiConsentAcceptedAt: null },
      data: { aiConsentAcceptedAt: new Date() },
    });
    return this.getProfile(userId);
  }

  /**
   * Updates basic profile information (fullName, headline, bio, location, school/major, skills, projects/activities).
   */
  async updateProfile(
    userId: string,
    input: UpdateCandidateProfileInput,
  ): Promise<CandidateProfile> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('NOT_FOUND', 'Candidate user not found');
    }

    const [updatedUser, profile] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { fullName: input.fullName },
      }),
      prisma.candidateProfile.upsert({
        where: { userId },
        create: {
          userId,
          headline: input.headline ?? null,
          bio: input.bio ?? null,
          location: input.location ?? null,
          schoolMajor: input.schoolMajor ?? null,
          skills: input.skills,
          projectsActivities: input.projectsActivities ?? null,
        },
        update: {
          headline: input.headline ?? null,
          bio: input.bio ?? null,
          location: input.location ?? null,
          schoolMajor: input.schoolMajor ?? null,
          skills: input.skills,
          projectsActivities: input.projectsActivities ?? null,
        },
        include: {
          resumes: {
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
    ]);

    const latestResume = profile.resumes?.[0];

    return {
      id: profile.id,
      userId: updatedUser.id,
      fullName: updatedUser.fullName ?? '',
      headline: profile.headline ?? null,
      bio: profile.bio ?? null,
      location: profile.location ?? null,
      schoolMajor: profile.schoolMajor ?? null,
      skills: profile.skills,
      projectsActivities: profile.projectsActivities ?? null,
      aiConsentAcceptedAt: profile.aiConsentAcceptedAt?.toISOString() ?? null,
      resumes: (profile.resumes || []).map((r) => ({
        id: r.id,
        candidateId: r.candidateId,
        fileName: r.fileName,
        contentType: r.contentType,
        sizeBytes: r.sizeBytes,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      cvOriginalFileName: latestResume?.fileName ?? null,
      cvUploadedAt: latestResume ? latestResume.createdAt.toISOString() : null,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    };
  }

  /**
   * Uploads or replaces candidate CV. Validates magic bytes, cleans up previous storage file,
   * saves new file, and persists metadata in Resume table.
   */
  async uploadCv(
    userId: string,
    fileBuffer: Buffer,
    originalFileName: string,
  ): Promise<CvMetadata> {
    const validation = validateCvFile(fileBuffer, originalFileName);
    if (!validation.valid) {
      throw new AppError('VALIDATION_ERROR', validation.error || 'Invalid CV file');
    }

    let profile = await prisma.candidateProfile.findUnique({
      where: { userId },
      include: { resumes: withUsageCount },
    });

    if (!profile) {
      profile = await prisma.candidateProfile.create({
        data: {
          userId,
          skills: [],
        },
        include: { resumes: withUsageCount },
      });
    }

    const storageKey = await this.storage.save(fileBuffer, originalFileName);

    const resume = await prisma.resume.create({
      data: {
        candidateId: profile.id,
        fileName: originalFileName,
        storageKey,
        contentType: 'application/pdf',
        sizeBytes: fileBuffer.length,
      },
    });

    // Drop the replaced CVs only after the new one is saved. One that an application or an AI
    // check points at stays, with its file, because those rows must keep resolving to it.
    for (const oldResume of profile.resumes ?? []) {
      if (isReferenced(oldResume)) continue;
      await prisma.resume.delete({ where: { id: oldResume.id } });
      await this.storage.delete(oldResume.storageKey);
    }

    return {
      id: resume.id,
      originalFileName: resume.fileName,
      fileSize: resume.sizeBytes,
      uploadedAt: resume.createdAt.toISOString(),
    };
  }

  /**
   * Deletes current CV from storage and clears database records.
   */
  async deleteCv(userId: string): Promise<void> {
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId },
      include: { resumes: withUsageCount },
    });

    if (!profile || !profile.resumes || profile.resumes.length === 0) {
      throw new AppError('NOT_FOUND', 'No CV uploaded for candidate');
    }

    // Refuse before touching storage: an application or AI check still needs the file.
    if (profile.resumes.some(isReferenced)) {
      throw new AppError(
        'CONFLICT',
        'This CV was used in an application or AI check and cannot be deleted. Upload a replacement instead.',
      );
    }

    for (const resume of profile.resumes) {
      await prisma.resume.delete({ where: { id: resume.id } });
      await this.storage.delete(resume.storageKey);
    }
  }

  /**
   * Streams CV file with owner-only access verification.
   */
  async getCvStream(
    requesterUserId: string,
    targetCandidateUserId: string,
  ): Promise<{ stream: Readable; originalFileName: string; mimeType: string }> {
    if (requesterUserId !== targetCandidateUserId) {
      throw new AppError('FORBIDDEN', 'Forbidden: You can only access your own CV');
    }

    const profile = await prisma.candidateProfile.findUnique({
      where: { userId: targetCandidateUserId },
      include: {
        resumes: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!profile || !profile.resumes || profile.resumes.length === 0) {
      throw new AppError('NOT_FOUND', 'CV file not found');
    }

    const latestResume = profile.resumes[0];
    if (!latestResume) {
      throw new AppError('NOT_FOUND', 'CV file not found');
    }

    const stream = await this.storage.getStream(latestResume.storageKey);
    return {
      stream,
      originalFileName: latestResume.fileName,
      mimeType: latestResume.contentType,
    };
  }
}
