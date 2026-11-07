import type { RequestHandler } from 'express';
import type { HealthResponse } from '@launchly/shared';

export const getHealth: RequestHandler = (_req, res) => {
  const body: HealthResponse = { status: 'ok', time: new Date().toISOString() };
  res.json(body);
};
