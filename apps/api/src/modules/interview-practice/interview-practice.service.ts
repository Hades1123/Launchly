import type { PrismaClient } from '@/generated/prisma/client';
import {
  PRACTICE_EXPIRY_HOURS,
  generatedPracticeQuestionsSchema,
  isInteractiveRoundFormat,
  type PracticeAnswerInput,
  type PracticeHistoryQuery,
  type PracticeHistoryResponse,
  type PracticeSessionDto,
  type StartPracticeInput,
} from '@launchly/shared';
import { AppError } from '@/lib/app-error';
import { AI_TIMEOUT_MS, getAiProvider, withTimeout, type AiProvider } from '@/providers/ai';

type Options = { now?: () => Date; ai?: AiProvider; timeoutMs?: number };

const QUESTIONS_SYSTEM_PROMPT = [
  'You write interview practice questions for a candidate who is preparing for one round of a hiring process.',
  'Use only the job title, job description, requirements and round you are given.',
  'Write exactly five distinct questions, each answerable in writing, with no voice or video.',
  'Tag each question with where it comes from: JOB_DESCRIPTION, JOB_REQUIREMENTS or ROUND_PROCESS.',
  'Do not ask about personal attributes such as age, gender or hometown.',
].join(' ');

function buildQuestionsPrompt(
  job: { title: string; description: string; requirements: string[] },
  round: { name: string; format: string },
): string {
  const requirements = job.requirements.length
    ? `\n\n## Requirements\n${job.requirements.map((r) => `- ${r}`).join('\n')}`
    : '';
  return `## Job\n${job.title}\n\n## Description\n${job.description}${requirements}\n\n## Round\n${round.name} (${round.format})`;
}

const sessionInclude = {
  job: { select: { title: true } },
  rounds: {
    orderBy: { position: 'asc' },
    include: {
      questions: { orderBy: { position: 'asc' }, include: { answer: true } },
    },
  },
} as const;

type SessionRow = {
  id: string;
  jobId: string;
  applicationId: string | null;
  scope: PracticeSessionDto['scope'];
  status: PracticeSessionDto['status'];
  interviewConsentAt: Date | null;
  lastActivityAt: Date;
  expiresAt: Date | null;
  summary: string | null;
  createdAt: Date;
  job: { title: string };
  rounds: Array<{
    id: string;
    stageId: string | null;
    name: string;
    position: number;
    status: PracticeSessionDto['status'];
    feedback: string | null;
    questions: Array<{
      id: string;
      position: number;
      prompt: string;
      source: string;
      answer: { answer: string; feedback: string | null; score: unknown } | null;
    }>;
  }>;
};

function toDto(row: SessionRow): PracticeSessionDto {
  return {
    id: row.id,
    jobId: row.jobId,
    jobTitle: row.job.title,
    applicationId: row.applicationId,
    scope: row.scope,
    status: row.status,
    interviewConsentAt: row.interviewConsentAt?.toISOString() ?? null,
    lastActivityAt: row.lastActivityAt.toISOString(),
    expiresAt: row.expiresAt?.toISOString() ?? null,
    summary: row.summary,
    createdAt: row.createdAt.toISOString(),
    rounds: row.rounds.map((round) => ({
      id: round.id,
      stageId: round.stageId,
      name: round.name,
      position: round.position,
      status: round.status,
      feedback: round.feedback,
      questions: round.questions.map((q) => ({
        id: q.id,
        position: q.position,
        prompt: q.prompt,
        source: q.source,
        answer: q.answer
          ? {
              answer: q.answer.answer,
              feedback: q.answer.feedback,
              score: q.answer.score === null ? null : Number(q.answer.score),
            }
          : null,
      })),
    })),
  };
}

/** The deadline of an incomplete session that was active at `now`. */
export function practiceExpiry(now: Date): Date {
  return new Date(now.getTime() + PRACTICE_EXPIRY_HOURS * 60 * 60 * 1000);
}

/** An incomplete session past its deadline is gone for the candidate, even before cleanup. */
export function isPracticeExpired(
  session: { status: string; expiresAt: Date | null },
  now: Date,
): boolean {
  return session.status !== 'COMPLETED' && session.expiresAt !== null && session.expiresAt <= now;
}

export function createInterviewPracticeService(prisma: PrismaClient, options: Options = {}) {
  const now = options.now ?? (() => new Date());
  const timeoutMs = options.timeoutMs ?? AI_TIMEOUT_MS;

  async function candidateIdFor(userId: string): Promise<string> {
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) throw new AppError('FORBIDDEN', 'Candidate profile not found');
    return profile.id;
  }

  /** Saving activity moves the 24 h inactivity deadline. */
  function touch(id: string, at: Date) {
    return prisma.interviewSession.update({
      where: { id },
      data: { lastActivityAt: at, expiresAt: practiceExpiry(at) },
      include: sessionInclude,
    });
  }

  /** The session must be live and the candidate must have given interview AI consent. */
  function assertUsable(
    session: { expiresAt: Date | null; status: string; interviewConsentAt: Date | null },
    at: Date,
  ) {
    if (isPracticeExpired(session, at))
      throw new AppError('NOT_FOUND', 'Practice session not found');
    if (!session.interviewConsentAt) {
      throw new AppError('FORBIDDEN', 'Accept the interview AI consent to use practice');
    }
  }

  return {
    /** Returns the session and whether it was created (true) or an active one was reused. */
    async start(
      userId: string,
      input: StartPracticeInput,
    ): Promise<{ session: PracticeSessionDto; created: boolean }> {
      const candidateId = await candidateIdFor(userId);
      const job = await prisma.job.findFirst({
        where: { id: input.jobId, publicationStatus: 'PUBLISHED' },
        select: {
          id: true,
          description: true,
          stages: {
            orderBy: { position: 'asc' },
            select: { id: true, name: true, format: true, position: true },
          },
        },
      });
      if (!job) throw new AppError('NOT_FOUND', 'Job not found');
      if (job.description.trim() === '') {
        throw new AppError('VALIDATION_ERROR', 'This job has no description to practice from');
      }
      if (job.stages.length === 0) {
        throw new AppError('VALIDATION_ERROR', 'This job has no hiring process to practice');
      }

      let selected = job.stages.filter((stage) => isInteractiveRoundFormat(stage.format));
      if (input.stageId) {
        const stage = job.stages.find((s) => s.id === input.stageId);
        if (!stage) throw new AppError('VALIDATION_ERROR', 'Round not found for this job');
        if (!isInteractiveRoundFormat(stage.format)) {
          throw new AppError(
            'VALIDATION_ERROR',
            'This round is informational and cannot be practiced',
          );
        }
        selected = [stage];
      } else if (selected.length === 0) {
        throw new AppError('VALIDATION_ERROR', 'This job has no round that can be practiced');
      }

      const at = now();
      const scope = input.stageId ? 'ROUND' : 'FULL';
      const existing = await prisma.interviewSession.findFirst({
        where: {
          candidateId,
          jobId: job.id,
          scope,
          status: { not: 'COMPLETED' },
          expiresAt: { gt: at },
          ...(input.stageId ? { rounds: { some: { stageId: input.stageId } } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      if (existing) {
        return { session: toDto((await touch(existing.id, at)) as SessionRow), created: false };
      }

      const application = await prisma.application.findUnique({
        where: { candidateId_jobId: { candidateId, jobId: job.id } },
        select: { id: true },
      });
      const created = await prisma.interviewSession.create({
        data: {
          candidateId,
          jobId: job.id,
          applicationId: application?.id ?? null,
          scope,
          status: 'IN_PROGRESS',
          startedAt: at,
          interviewConsentAt: at,
          lastActivityAt: at,
          expiresAt: practiceExpiry(at),
          rounds: {
            create: selected.map((stage, index) => ({
              stageId: stage.id,
              name: stage.name,
              position: index + 1,
            })),
          },
        },
        include: sessionInclude,
      });
      return { session: toDto(created as SessionRow), created: true };
    },

    async resume(userId: string, id: string): Promise<PracticeSessionDto> {
      const candidateId = await candidateIdFor(userId);
      const session = await prisma.interviewSession.findFirst({
        where: { id, candidateId },
        include: sessionInclude,
      });
      const at = now();
      if (!session || isPracticeExpired(session, at)) {
        throw new AppError('NOT_FOUND', 'Practice session not found');
      }
      // Completed sessions are history; legacy sessions have no expiry and must never get one.
      if (session.status === 'COMPLETED' || session.expiresAt === null) {
        return toDto(session as SessionRow);
      }
      return toDto((await touch(session.id, at)) as SessionRow);
    },

    /**
     * Writes the five questions of one round, once. A repeat returns the stored set and makes
     * no AI call; a provider failure stores nothing so the same call can be retried.
     */
    async generateQuestions(
      userId: string,
      sessionId: string,
      roundId: string,
    ): Promise<{ session: PracticeSessionDto; created: boolean }> {
      const candidateId = await candidateIdFor(userId);
      const round = await prisma.interviewPracticeRound.findFirst({
        where: { id: roundId, sessionId, session: { candidateId } },
        select: {
          id: true,
          name: true,
          stage: { select: { format: true } },
          session: {
            select: {
              id: true,
              status: true,
              expiresAt: true,
              interviewConsentAt: true,
              job: { select: { title: true, description: true, requirements: true } },
            },
          },
          _count: { select: { questions: true } },
        },
      });
      const at = now();
      if (!round) throw new AppError('NOT_FOUND', 'Practice round not found');
      assertUsable(round.session, at);

      if (round._count.questions > 0) {
        return { session: toDto((await touch(sessionId, at)) as SessionRow), created: false };
      }

      const format = round.stage?.format ?? null;
      if (!format || !isInteractiveRoundFormat(format)) {
        throw new AppError('VALIDATION_ERROR', 'This round cannot be practiced');
      }
      const { job } = round.session;
      if (job.description.trim() === '') {
        throw new AppError('VALIDATION_ERROR', 'This job has no description to practice from');
      }

      let generated;
      try {
        generated = await withTimeout(
          (options.ai ?? getAiProvider()).generateJson({
            system: QUESTIONS_SYSTEM_PROMPT,
            prompt: buildQuestionsPrompt(job, { name: round.name, format }),
            schema: generatedPracticeQuestionsSchema,
          }),
          timeoutMs,
        );
      } catch (error) {
        throw error instanceof AppError && error.code === 'AI_UNAVAILABLE'
          ? error
          : new AppError('AI_UNAVAILABLE', 'The AI could not write questions. Try again later.');
      }

      // The AI call is slow, so the lock is taken only to write: a request that lost the race
      // finds the set already there and leaves it, and its answers, untouched.
      const created = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "InterviewPracticeRound" WHERE id = ${roundId} FOR UPDATE`;
        if ((await tx.interviewPracticeQuestion.count({ where: { roundId } })) > 0) return false;
        await tx.interviewPracticeQuestion.createMany({
          data: generated.questions.map((question, index) => ({
            roundId,
            position: index + 1,
            prompt: question.prompt,
            source: question.source,
          })),
        });
        await tx.interviewPracticeRound.update({
          where: { id: roundId },
          data: { status: 'IN_PROGRESS' },
        });
        return true;
      });
      return { session: toDto((await touch(sessionId, at)) as SessionRow), created };
    },

    /** Saves or replaces the text answer to one question and moves the 24 h clock. */
    async saveAnswer(
      userId: string,
      sessionId: string,
      questionId: string,
      input: PracticeAnswerInput,
    ): Promise<PracticeSessionDto> {
      const candidateId = await candidateIdFor(userId);
      const question = await prisma.interviewPracticeQuestion.findFirst({
        where: { id: questionId, round: { sessionId, session: { candidateId } } },
        select: {
          id: true,
          round: {
            select: {
              id: true,
              status: true,
              session: {
                select: { id: true, status: true, expiresAt: true, interviewConsentAt: true },
              },
            },
          },
        },
      });
      const at = now();
      if (!question) throw new AppError('NOT_FOUND', 'Question not found');
      assertUsable(question.round.session, at);
      if (question.round.status === 'COMPLETED') {
        throw new AppError('CONFLICT', 'This round is completed and its answers are final');
      }

      await prisma.interviewPracticeAnswer.upsert({
        where: { questionId },
        create: { questionId, answer: input.answer },
        update: { answer: input.answer },
      });
      await prisma.interviewPracticeRound.updateMany({
        where: { id: question.round.id, status: 'NOT_STARTED' },
        data: { status: 'IN_PROGRESS' },
      });
      return toDto((await touch(sessionId, at)) as SessionRow);
    },

    async history(userId: string, query: PracticeHistoryQuery): Promise<PracticeHistoryResponse> {
      const candidateId = await candidateIdFor(userId);
      const at = now();
      const where = {
        candidateId,
        OR: [{ status: 'COMPLETED' as const }, { expiresAt: null }, { expiresAt: { gt: at } }],
      };
      const [rows, total] = await Promise.all([
        prisma.interviewSession.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
          select: {
            id: true,
            jobId: true,
            scope: true,
            status: true,
            createdAt: true,
            completedAt: true,
            job: { select: { title: true } },
            _count: { select: { rounds: true } },
          },
        }),
        prisma.interviewSession.count({ where }),
      ]);
      return {
        data: rows.map((row) => ({
          id: row.id,
          jobId: row.jobId,
          jobTitle: row.job.title,
          scope: row.scope,
          status: row.status,
          roundCount: row._count.rounds,
          createdAt: row.createdAt.toISOString(),
          completedAt: row.completedAt?.toISOString() ?? null,
        })),
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    },
  };
}
