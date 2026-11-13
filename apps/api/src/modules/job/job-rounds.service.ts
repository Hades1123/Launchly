import { Prisma, type PrismaClient } from '@/generated/prisma/client';
import { roundFormatSchema, type ReplaceRoundsInput, type RoundDto } from '@launchly/shared';
import { AppError } from '@/lib/app-error';

type StageRow = {
  id: string;
  name: string;
  format: string | null;
  estimatedDurationMinutes: number | null;
  position: number;
};

const stageSelect = {
  id: true,
  name: true,
  format: true,
  estimatedDurationMinutes: true,
  position: true,
} as const;

function toDto(row: StageRow): RoundDto {
  const format = roundFormatSchema.safeParse(row.format);
  return {
    id: row.id,
    name: row.name,
    format: format.success ? format.data : null,
    estimatedDurationMinutes: row.estimatedDurationMinutes,
    position: row.position,
  };
}

export function createJobRoundsService(prisma: PrismaClient) {
  async function assertOwner(jobId: string, userId: string) {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { createdById: true, company: { select: { ownerId: true } } },
    });
    if (!job) throw new AppError('NOT_FOUND', 'Job not found');
    if (job.createdById !== userId && job.company.ownerId !== userId) {
      throw new AppError('FORBIDDEN', 'You do not manage this job');
    }
  }

  return {
    async list(jobId: string, userId: string): Promise<RoundDto[]> {
      await assertOwner(jobId, userId);
      const rows = await prisma.jobStage.findMany({
        where: { jobId },
        orderBy: { position: 'asc' },
        select: stageSelect,
      });
      return rows.map(toDto);
    },

    /** Replaces the whole ordered list. Array order becomes `position` 1..n. */
    async replace(jobId: string, userId: string, input: ReplaceRoundsInput): Promise<RoundDto[]> {
      await assertOwner(jobId, userId);
      return prisma.$transaction(async (tx) => {
        // Serialise concurrent saves for this job; the loser re-reads the winner's committed rounds.
        await tx.$queryRaw`SELECT id FROM "Job" WHERE id = ${jobId} FOR UPDATE`;
        const existing = await tx.jobStage.findMany({ where: { jobId }, select: { id: true } });
        const existingIds = new Set(existing.map((s) => s.id));
        const keptIds = new Set<string>();
        for (const round of input.rounds) {
          if (!round.id) continue;
          if (!existingIds.has(round.id) || keptIds.has(round.id)) {
            throw new AppError('VALIDATION_ERROR', 'Unknown or duplicate round id');
          }
          keptIds.add(round.id);
        }

        const removedIds = [...existingIds].filter((id) => !keptIds.has(id));
        if (removedIds.length > 0) {
          // Row locks make a concurrent application move (FK key-share lock) finish before we count.
          await tx.$queryRaw`SELECT id FROM "JobStage" WHERE id IN (${Prisma.join(removedIds)}) FOR UPDATE`;
          const inUse = await tx.application.count({
            where: { currentStageId: { in: removedIds } },
          });
          if (inUse > 0) {
            throw new AppError('CONFLICT', 'A round with active applications cannot be deleted');
          }
          await tx.jobStage.deleteMany({ where: { id: { in: removedIds } } });
        }

        // Park kept rounds on negative positions so reordering never hits @@unique([jobId, position]).
        let parked = 0;
        for (const id of keptIds) {
          parked += 1;
          await tx.jobStage.update({ where: { id }, data: { position: -parked } });
        }

        const result: RoundDto[] = [];
        for (const [index, round] of input.rounds.entries()) {
          const data = {
            name: round.name,
            format: round.format,
            estimatedDurationMinutes: round.estimatedDurationMinutes,
            position: index + 1,
          };
          const row = round.id
            ? await tx.jobStage.update({ where: { id: round.id }, data, select: stageSelect })
            : await tx.jobStage.create({ data: { jobId, ...data }, select: stageSelect });
          result.push(toDto(row));
        }
        return result;
      });
    },
  };
}
