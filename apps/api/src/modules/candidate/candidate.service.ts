import type { Readable } from 'stream';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/app-error';
import { getStorageProvider, type StorageProvider } from '@/providers/storage';
import { validateCvFile } from './cv-validator';
import type { CandidateProfile, UpdateCandidateProfileInput, CvMetadata } from '@launchly/shared';

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
      fullName: user.fullName,
      headline: profile.headline ?? null,
      bio: profile.bio ?? null,
      location: profile.location ?? null,
      schoolMajor: profile.schoolMajor ?? null,
      skills: profile.skills,
      projectsActivities: profile.projectsActivities ?? null,
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
      fullName: updatedUser.fullName,
      headline: profile.headline ?? null,
      bio: profile.bio ?? null,
      location: profile.location ?? null,
      schoolMajor: profile.schoolMajor ?? null,
      skills: profile.skills,
      projectsActivities: profile.projectsActivities ?? null,
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
      include: { resumes: true },
    });

    if (!profile) {
      profile = await prisma.candidateProfile.create({
        data: {
          userId,
          skills: [],
        },
        include: { resumes: true },
      });
    }

    // Clean up old resumes to prevent orphaned storage files
    if (profile.resumes && profile.resumes.length > 0) {
      for (const oldResume of profile.resumes) {
        await this.storage.delete(oldResume.storageKey);
        await prisma.resume.delete({ where: { id: oldResume.id } });
      }
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
      include: { resumes: true },
    });

    if (!profile || !profile.resumes || profile.resumes.length === 0) {
      throw new AppError('NOT_FOUND', 'No CV uploaded for candidate');
    }

    for (const resume of profile.resumes) {
      await this.storage.delete(resume.storageKey);
      await prisma.resume.delete({ where: { id: resume.id } });
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
