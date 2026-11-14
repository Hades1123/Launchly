import {
  practiceHistoryResponseSchema,
  practiceSessionDtoSchema,
  type PracticeAnswerInput,
  type PracticeHistoryQuery,
  type StartPracticeInput,
} from '@launchly/shared';
import { request } from '@/lib/api/http';

const BASE = '/candidates/me/interview-practice';
const session = (id: string) => `${BASE}/${encodeURIComponent(id)}`;

/** Starts practice for a job, or returns the candidate's live session for it. */
export function startPractice(input: StartPracticeInput) {
  return request(BASE, practiceSessionDtoSchema, { method: 'POST', body: input });
}

/** One session with its saved progress; rejects with `ApiError` (404) when it is gone or expired. */
export function getPracticeSession(id: string) {
  return request(session(id), practiceSessionDtoSchema);
}

/** Completed and still-live sessions, newest first, one page at a time. */
export function listPracticeHistory(query: Partial<PracticeHistoryQuery> = {}) {
  return request(BASE, practiceHistoryResponseSchema, { query });
}

/** Writes the five questions of a round; the AI call can take up to 30 s. */
export function generateRoundQuestions(id: string, roundId: string) {
  return request(
    `${session(id)}/rounds/${encodeURIComponent(roundId)}/questions`,
    practiceSessionDtoSchema,
    {
      method: 'POST',
    },
  );
}

/** Writes the round feedback (and the summary after the last round); can take up to 30 s. */
export function generateRoundFeedback(id: string, roundId: string) {
  return request(
    `${session(id)}/rounds/${encodeURIComponent(roundId)}/feedback`,
    practiceSessionDtoSchema,
    {
      method: 'POST',
    },
  );
}

/** Saves or replaces the text answer to one question. */
export function savePracticeAnswer(id: string, questionId: string, input: PracticeAnswerInput) {
  return request(
    `${session(id)}/questions/${encodeURIComponent(questionId)}/answer`,
    practiceSessionDtoSchema,
    { method: 'PUT', body: input },
  );
}
