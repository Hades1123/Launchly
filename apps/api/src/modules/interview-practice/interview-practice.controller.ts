import type { RequestHandler } from 'express';
import {
  practiceHistoryResponseSchema,
  practiceSessionDtoSchema,
  type PracticeHistoryQuery,
} from '@launchly/shared';
import { currentAuth } from '@/middlewares/authenticate';
import type { createInterviewPracticeService } from '@/modules/interview-practice/interview-practice.service';

type Service = ReturnType<typeof createInterviewPracticeService>;

export function createInterviewPracticeController(service: Service) {
  return {
    start: (async (req, res) => {
      const { userId } = currentAuth(res.locals);
      const { session, created } = await service.start(userId, req.body);
      res.status(created ? 201 : 200).json(practiceSessionDtoSchema.parse(session));
    }) satisfies RequestHandler,

    resume: (async (req, res) => {
      const { userId } = currentAuth(res.locals);
      const id = String(req.params.id);
      res.json(practiceSessionDtoSchema.parse(await service.resume(userId, id)));
    }) satisfies RequestHandler,

    generateQuestions: (async (req, res) => {
      const { userId } = currentAuth(res.locals);
      const { session, created } = await service.generateQuestions(
        userId,
        String(req.params.id),
        String(req.params.roundId),
      );
      res.status(created ? 201 : 200).json(practiceSessionDtoSchema.parse(session));
    }) satisfies RequestHandler,

    generateFeedback: (async (req, res) => {
      const { userId } = currentAuth(res.locals);
      const { session, created } = await service.generateFeedback(
        userId,
        String(req.params.id),
        String(req.params.roundId),
      );
      res.status(created ? 201 : 200).json(practiceSessionDtoSchema.parse(session));
    }) satisfies RequestHandler,

    saveAnswer: (async (req, res) => {
      const { userId } = currentAuth(res.locals);
      const session = await service.saveAnswer(
        userId,
        String(req.params.id),
        String(req.params.questionId),
        req.body,
      );
      res.json(practiceSessionDtoSchema.parse(session));
    }) satisfies RequestHandler,

    history: (async (req, res) => {
      const { userId } = currentAuth(res.locals);
      const query = req.query as unknown as PracticeHistoryQuery;
      res.json(practiceHistoryResponseSchema.parse(await service.history(userId, query)));
    }) satisfies RequestHandler,
  };
}
