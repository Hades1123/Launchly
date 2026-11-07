import { Router } from 'express';
import { getHealth } from '@/modules/health/health.controller';

export const healthRouter = Router();
healthRouter.get('/', getHealth);
