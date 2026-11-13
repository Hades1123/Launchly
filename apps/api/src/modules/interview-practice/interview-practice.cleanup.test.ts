/* eslint-disable @typescript-eslint/no-explicit-any */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://launchly:launchly@localhost:5433/launchly';
process.env.JWT_SECRET = 'change-me-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'change-me-too-at-least-32-characters';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@/generated/prisma/client';
import { createPracticeCleanup } from '@/modules/interview-practice/interview-practice.cleanup';
import {
  isPracticeExpired,
  practiceExpiry,
} from '@/modules/interview-practice/interview-practice.service';

const NOW = new Date('2026-11-13T10:00:00.000Z');
const HOUR = 60 * 60 * 1000;

const ids = (n: number, from = 0) =>
  Array.from({ length: n }, (_, i) => ({ id: `session-${from + i}` }));

function makePrisma() {
  return {
    interviewSession: {
      findMany: vi.fn<(args: any) => Promise<any>>(async () => []),
      deleteMany: vi.fn<(args: any) => Promise<any>>(async ({ where }: any) => ({
        count: where.id.in.length,
      })),
    },
  };
}

function makeCleanup(prisma = makePrisma(), log = vi.fn()) {
  const cleanup = createPracticeCleanup(prisma as unknown as PrismaClient, {
    now: () => NOW,
    log,
  });
  return { cleanup, prisma, log };
}

describe('practice expiry rule', () => {
  it('sets the deadline 24 hours after the activity', () => {
    expect(practiceExpiry(NOW).toISOString()).toBe('2026-11-14T10:00:00.000Z');
  });

  it('expires an incomplete session at the deadline, never a completed or legacy one', () => {
    const past = new Date(NOW.getTime() - 1);
    expect(isPracticeExpired({ status: 'IN_PROGRESS', expiresAt: past }, NOW)).toBe(true);
    expect(isPracticeExpired({ status: 'NOT_STARTED', expiresAt: NOW }, NOW)).toBe(true);
    expect(isPracticeExpired({ status: 'IN_PROGRESS', expiresAt: practiceExpiry(NOW) }, NOW)).toBe(
      false,
    );
    expect(isPracticeExpired({ status: 'COMPLETED', expiresAt: past }, NOW)).toBe(false);
    expect(isPracticeExpired({ status: 'IN_PROGRESS', expiresAt: null }, NOW)).toBe(false);
  });
});

describe('createPracticeCleanup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('sweeps at start and then every hour', async () => {
    const { cleanup, prisma } = makeCleanup();

    cleanup.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(prisma.interviewSession.findMany).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(HOUR - 1);
    expect(prisma.interviewSession.findMany).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(prisma.interviewSession.findMany).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(HOUR);
    expect(prisma.interviewSession.findMany).toHaveBeenCalledTimes(3);
    cleanup.stop();
  });

  it('schedules once when started twice and stops cleanly', async () => {
    const { cleanup, prisma } = makeCleanup();

    cleanup.start();
    cleanup.start();
    await vi.advanceTimersByTimeAsync(HOUR);
    expect(prisma.interviewSession.findMany).toHaveBeenCalledTimes(2); // start + one tick

    cleanup.stop();
    await vi.advanceTimersByTimeAsync(3 * HOUR);
    expect(prisma.interviewSession.findMany).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('drains the backlog in batches of 100 without one query per session', async () => {
    const { cleanup, prisma } = makeCleanup();
    prisma.interviewSession.findMany
      .mockResolvedValueOnce(ids(100))
      .mockResolvedValueOnce(ids(100, 100))
      .mockResolvedValueOnce(ids(30, 200));

    const deleted = await cleanup.sweep();

    expect(deleted).toBe(230);
    expect(prisma.interviewSession.findMany).toHaveBeenCalledTimes(3);
    expect(prisma.interviewSession.deleteMany).toHaveBeenCalledTimes(3);
    const find = prisma.interviewSession.findMany.mock.calls[0]![0];
    expect(find).toMatchObject({
      take: 100,
      orderBy: { expiresAt: 'asc' },
      where: { status: { not: 'COMPLETED' }, expiresAt: { lte: NOW } },
    });
    // The delete repeats the guard so a session completed meanwhile is never removed.
    expect(prisma.interviewSession.deleteMany.mock.calls[0]![0].where).toMatchObject({
      id: { in: ids(100).map((r) => r.id) },
      status: { not: 'COMPLETED' },
      expiresAt: { lte: NOW },
    });
  });

  it('does nothing when there is nothing to delete', async () => {
    const { cleanup, prisma } = makeCleanup();

    expect(await cleanup.sweep()).toBe(0);
    expect(prisma.interviewSession.deleteMany).not.toHaveBeenCalled();
  });

  it('logs only counts and surfaces a database failure without hiding it', async () => {
    const { cleanup, prisma, log } = makeCleanup();
    prisma.interviewSession.findMany.mockResolvedValueOnce(ids(2));

    cleanup.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(log).toHaveBeenCalledWith('Interview practice cleanup deleted 2 expired sessions');

    prisma.interviewSession.findMany.mockRejectedValueOnce(new Error('boom: my secret answer'));
    await expect(cleanup.sweep()).rejects.toThrow('boom');

    prisma.interviewSession.findMany.mockRejectedValueOnce(new Error('boom: my secret answer'));
    await vi.advanceTimersByTimeAsync(HOUR);
    const failure = log.mock.calls.map((c) => String(c[0])).find((m) => m.includes('failed'));
    expect(failure).toBe('Interview practice cleanup failed');
    expect(log.mock.calls.flat().join(' ')).not.toContain('secret');

    // The runner survives a failed tick and sweeps again an hour later.
    const calls = prisma.interviewSession.findMany.mock.calls.length;
    await vi.advanceTimersByTimeAsync(HOUR);
    expect(prisma.interviewSession.findMany.mock.calls.length).toBe(calls + 1);
    cleanup.stop();
  });
});
