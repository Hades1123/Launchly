import { Prisma, type PrismaClient } from '@/generated/prisma/client';
import {
  assessmentResultSchema,
  type AssessmentDto,
  type CreateAssessmentInput,
} from '@launchly/shared';
import { AppError } from '@/lib/app-error';
import { publicJobWhere } from '@/modules/job/job.service';
import { getResumeText } from '@/modules/candidate/cv-text.service';
import { AI_TIMEOUT_MS, getAiProvider, withTimeout, type AiProvider } from '@/providers/ai';

export const ASSESSMENT_TIMEOUT_MS = AI_TIMEOUT_MS;

const SYSTEM_PROMPT = [
  'You are a recruiter who checks how well a candidate CV matches a job description.',
  'Use only the CV text and the job description you are given.',
  'Do not guess or mention name, gender, age, photo, hometown or any other personal attribute.',
  'Return a score from 0 to 100, the points that match (each tagged skill, project or education),',
  'the missing skills (each tagged required or nice_to_have), at least 3 concrete suggestions,',
  'and short quotes from the CV as evidence.',
].join(' ');

export interface AssessmentServiceOptions {
  ai?: AiProvider;
  /** Reads the text of a stored CV; defaults to the PDF extractor. */
  readResumeText?: (resume: { storageKey: string }) => Promise<string>;
  timeoutMs?: number;
}

function buildPrompt(cvText: string, jobText: string): string {
  return `## CV\n${cvText}\n\n## Job description\n${jobText}`;
}

function jobToText(job: { title: string; description: string; requirements: string[] }): string {
  const requirements = job.requirements.length
    ? `\nRequirements:\n${job.requirements.map((r) => `- ${r}`).join('\n')}`
    : '';
  return `${job.title}\n${job.description}${requirements}`;
}

export function createAssessmentService(
  prisma: PrismaClient,
  options: AssessmentServiceOptions = {},
) {
  const timeoutMs = options.timeoutMs ?? ASSESSMENT_TIMEOUT_MS;

  return {
    /** Scores a CV against a job and stores the outcome (COMPLETED, or FAILED with the reason). */
    async create(userId: string, input: CreateAssessmentInput): Promise<AssessmentDto> {
      // Only the id and the consent flag are read: no profile field can reach the prompt.
      const candidate = await prisma.candidateProfile.findUnique({
        where: { userId },
        select: { id: true, aiConsentAcceptedAt: true },
      });
      if (!candidate) throw new AppError('FORBIDDEN', 'Create your candidate profile first');

      const resume = await prisma.resume.findUnique({
        where: { id: input.resumeId },
        select: { id: true, candidateId: true, storageKey: true },
      });
      if (!resume) throw new AppError('NOT_FOUND', 'CV not found');
      if (resume.candidateId !== candidate.id) {
        throw new AppError('FORBIDDEN', 'You can only check your own CV');
      }
      if (!candidate.aiConsentAcceptedAt) {
        throw new AppError('FORBIDDEN', 'Accept the AI consent before checking your CV');
      }

      let jobText: string;
      if (input.jobId) {
        const job = await prisma.job.findFirst({
          where: { id: input.jobId, ...publicJobWhere },
          select: { title: true, description: true, requirements: true },
        });
        if (!job) throw new AppError('NOT_FOUND', 'Job not found');
        jobText = jobToText(job);
      } else {
        jobText = input.jobDescription!;
      }

      const cvText = await (options.readResumeText ?? ((r) => getResumeText(r)))(resume);

      const base = {
        resumeId: resume.id,
        jobId: input.jobId ?? null,
        suppliedJobDescription: input.jobDescription ?? null,
      };

      let result;
      try {
        result = await withTimeout(
          (options.ai ?? getAiProvider()).generateJson({
            system: SYSTEM_PROMPT,
            prompt: buildPrompt(cvText, jobText),
            schema: assessmentResultSchema,
          }),
          timeoutMs,
        );
      } catch (error) {
        const reason = error instanceof AppError ? error.message : 'The AI request failed';
        await prisma.aiAssessment.create({
          data: { ...base, status: 'FAILED', failureReason: reason },
        });
        throw error instanceof AppError && error.code === 'AI_UNAVAILABLE'
          ? error
          : new AppError('AI_UNAVAILABLE', 'The AI could not check your CV. Try again later.');
      }

      const stored = await prisma.aiAssessment.create({
        data: {
          ...base,
          status: 'COMPLETED',
          score: result.score,
          matchedSkills: result.matched.map((m) => m.point),
          missingSkills: result.missing.map((m) => m.skill),
          suggestions: result.suggestions,
          evidence: result.evidence.join('\n'),
          result: result as unknown as Prisma.InputJsonValue,
        },
        select: { id: true, createdAt: true },
      });
      return {
        id: stored.id,
        status: 'COMPLETED',
        resumeId: resume.id,
        jobId: input.jobId ?? null,
        createdAt: stored.createdAt.toISOString(),
        result,
      };
    },
  };
}
