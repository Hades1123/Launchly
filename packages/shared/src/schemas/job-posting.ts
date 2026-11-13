import { z } from 'zod';
import { JOB_INDUSTRIES, JOB_LOCATIONS } from '../constants/job';
import { jobLevelSchema, publicJobNoteSchema } from './job';
import {
  MAX_ROUND_DURATION_MINUTES,
  MAX_ROUNDS,
  MIN_ROUND_DURATION_MINUTES,
  roundDtoSchema,
  roundFormatSchema,
  roundInputSchema,
} from './job-round';

export const MAX_JOB_NOTES = 5;
export const MAX_JOB_NOTE_LENGTH = 500;
export const MAX_JOB_LIST_ITEMS = 20;
export const MAX_JOB_TITLE_LENGTH = 150;
export const MAX_JOB_DESCRIPTION_LENGTH = 5000;
/** Monthly salary in USD, as in the seed and the public job cards. */
export const MAX_JOB_SALARY = 1_000_000;

export const JOB_PUBLICATION_STATUSES = [
  'DRAFT',
  'PENDING',
  'PUBLISHED',
  'CLOSED',
  'REJECTED',
] as const;
export const jobPublicationStatusSchema = z.enum(JOB_PUBLICATION_STATUSES);
export type JobPublicationStatus = z.infer<typeof jobPublicationStatusSchema>;

/** Only drafts can be changed; a submitted or approved job is read-only (rejected-job edits are SCRUM-43). */
export function isJobEditable(status: JobPublicationStatus): boolean {
  return status === 'DRAFT';
}

const listItemsSchema = z.array(z.string().trim().min(1).max(300)).max(MAX_JOB_LIST_ITEMS);

const notesSchema = z
  .array(z.string().trim().min(1, 'Note cannot be empty').max(MAX_JOB_NOTE_LENGTH))
  .max(MAX_JOB_NOTES, `Maximum ${MAX_JOB_NOTES} notes`);

const salaryAmountSchema = z.number().int().min(0).max(MAX_JOB_SALARY).nullable();

const salaryBaseSchema = z.object({
  /** "Negotiable": candidates never see the figures, and the server stores none. */
  hidden: z.boolean(),
  min: salaryAmountSchema,
  max: salaryAmountSchema,
});

function checkSalaryRange(salary: z.infer<typeof salaryBaseSchema>, ctx: z.RefinementCtx) {
  if (salary.min !== null && salary.max !== null && salary.min > salary.max) {
    ctx.addIssue({
      code: 'custom',
      path: ['max'],
      message: 'Maximum salary must not be below the minimum',
    });
  }
}

const draftSalarySchema = salaryBaseSchema.superRefine(checkSalaryRange);

const submitSalarySchema = salaryBaseSchema.superRefine((salary, ctx) => {
  checkSalaryRange(salary, ctx);
  if (salary.hidden) return;
  for (const key of ['min', 'max'] as const) {
    if (salary[key] === null) {
      ctx.addIssue({
        code: 'custom',
        path: [key],
        message: 'Enter a salary or mark it as negotiable',
      });
    }
  }
});

/** A draft round may still miss its name, format or duration. */
const draftRoundSchema = z.object({
  name: z.string().trim().max(100),
  format: roundFormatSchema.nullable(),
  estimatedDurationMinutes: z
    .number()
    .int()
    .min(MIN_ROUND_DURATION_MINUTES)
    .max(MAX_ROUND_DURATION_MINUTES)
    .nullable(),
});

/**
 * Title, description, level and location are required even for a draft: the
 * database keeps them NOT NULL. Everything else is only enforced on submit.
 */
const draftJobSchema = z.object({
  action: z.literal('DRAFT'),
  title: z.string().trim().min(1, 'Position is required').max(MAX_JOB_TITLE_LENGTH),
  description: z.string().trim().min(1, 'Description is required').max(MAX_JOB_DESCRIPTION_LENGTH),
  level: jobLevelSchema,
  location: z.enum(JOB_LOCATIONS),
  industry: z.enum(JOB_INDUSTRIES).nullable(),
  requirements: listItemsSchema,
  benefits: listItemsSchema,
  salary: draftSalarySchema,
  rounds: z.array(draftRoundSchema).max(MAX_ROUNDS),
  notes: notesSchema,
});

const submitJobSchema = draftJobSchema.extend({
  action: z.literal('SUBMIT'),
  industry: z.enum(JOB_INDUSTRIES),
  salary: submitSalarySchema,
  rounds: z
    .array(roundInputSchema.omit({ id: true }))
    .min(1, 'Add at least one round')
    .max(MAX_ROUNDS),
});

/**
 * Body of `POST /recruiter/jobs` and `PUT /recruiter/jobs/:id`. `DRAFT` saves
 * without the submit rules; `SUBMIT` validates everything and sends the job to
 * admin approval. Rounds and notes replace the stored lists in array order.
 */
export const saveJobSchema = z.discriminatedUnion('action', [draftJobSchema, submitJobSchema]);
export type SaveJobInput = z.infer<typeof saveJobSchema>;
export type SaveJobAction = SaveJobInput['action'];

/** A job as its recruiter sees it, including the real salary and moderation state. */
export const recruiterJobSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string(),
  level: jobLevelSchema,
  location: z.string(),
  industry: z.string().nullable(),
  requirements: z.array(z.string()),
  benefits: z.array(z.string()),
  salary: z.object({
    hidden: z.boolean(),
    min: z.number().nullable(),
    max: z.number().nullable(),
  }),
  status: jobPublicationStatusSchema,
  /** The admin's reason when the job was rejected. */
  moderationReason: z.string().nullable(),
  rounds: z.array(roundDtoSchema),
  notes: z.array(publicJobNoteSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type RecruiterJob = z.infer<typeof recruiterJobSchema>;

export const recruiterJobListItemSchema = recruiterJobSchema.pick({
  id: true,
  title: true,
  level: true,
  location: true,
  status: true,
  moderationReason: true,
  updatedAt: true,
});
export type RecruiterJobListItem = z.infer<typeof recruiterJobListItemSchema>;

export const recruiterJobListResponseSchema = z.object({
  jobs: z.array(recruiterJobListItemSchema),
});
export type RecruiterJobListResponse = z.infer<typeof recruiterJobListResponseSchema>;
