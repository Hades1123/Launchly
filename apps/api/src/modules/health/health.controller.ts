import type { RequestHandler } from 'express';
import type { HealthResponse } from '@launchly/shared';

export const getHealth: RequestHandler = (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() } satisfies HealthResponse);
};
