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

/** Drafts and rejected jobs can be changed and (re)submitted; pending, approved and closed jobs are read-only. */
export function isJobEditable(status: JobPublicationStatus): boolean {
  return status === 'DRAFT' || status === 'REJECTED';
}

/** Only drafts can be deleted. */
export function isJobDeletable(status: JobPublicationStatus): boolean {
  return status === 'DRAFT';
}

/** At most this many drafts are deleted in one request. */
export const MAX_BULK_DELETE_JOBS = 50;

/** `POST /recruiter/jobs/bulk-delete`: drafts to delete, all or none. */
export const bulkDeleteJobsSchema = z.object({
  ids: z
    .array(z.string().uuid())
    .min(1)
    .max(MAX_BULK_DELETE_JOBS)
    .transform((ids) => [...new Set(ids)]),
});
export type BulkDeleteJobsInput = z.infer<typeof bulkDeleteJobsSchema>;

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

/** A submitted salary needs both figures in order, unless it is negotiable. */
const submitSalarySchema = salaryBaseSchema.superRefine((salary, ctx) => {
  if (salary.min !== null && salary.max !== null && salary.min > salary.max) {
    ctx.addIssue({
      code: 'custom',
      path: ['max'],
      message: 'Maximum salary must not be below the minimum',
    });
  }
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
 * A draft is saved as typed: nothing is required and no cross-field rule applies, only types and
 * length caps (an empty title, description or location is stored as `''`, a missing level as
 * `null`). Every rule for candidates is enforced on submit.
 */
const draftJobSchema = z.object({
  action: z.literal('DRAFT'),
  title: z.string().trim().max(MAX_JOB_TITLE_LENGTH),
  description: z.string().trim().max(MAX_JOB_DESCRIPTION_LENGTH),
  level: jobLevelSchema.nullable(),
  location: z.union([z.enum(JOB_LOCATIONS), z.literal('')]),
  industry: z.enum(JOB_INDUSTRIES).nullable(),
  requirements: listItemsSchema,
  benefits: listItemsSchema,
  salary: salaryBaseSchema,
  rounds: z.array(draftRoundSchema).max(MAX_ROUNDS),
  notes: notesSchema,
});

const submitJobSchema = draftJobSchema.extend({
  action: z.literal('SUBMIT'),
  title: z.string().trim().min(1, 'Position is required').max(MAX_JOB_TITLE_LENGTH),
  description: z.string().trim().min(1, 'Description is required').max(MAX_JOB_DESCRIPTION_LENGTH),
  level: jobLevelSchema,
  location: z.enum(JOB_LOCATIONS),
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
  /** `null` only for a draft saved before a level was chosen. */
  level: jobLevelSchema.nullable(),
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

export const RECRUITER_JOBS_PAGE_SIZE = 10;

/** `GET /recruiter/jobs`: filter by status, title text and level, one page at a time. */
export const recruiterJobListQuerySchema = z.object({
  status: jobPublicationStatusSchema.optional(),
  q: z.string().trim().max(MAX_JOB_TITLE_LENGTH).optional(),
  level: jobLevelSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(RECRUITER_JOBS_PAGE_SIZE),
});
export type RecruiterJobListQuery = z.infer<typeof recruiterJobListQuerySchema>;

export const recruiterJobStatusFilterSchema = z.enum(['ALL', ...JOB_PUBLICATION_STATUSES]);
export type RecruiterJobStatusFilter = z.infer<typeof recruiterJobStatusFilterSchema>;

export const recruiterJobListResponseSchema = z.object({
  jobs: z.array(recruiterJobListItemSchema),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
  /** Jobs per status for the current text and level filters, ignoring the status filter. */
  counts: z.record(recruiterJobStatusFilterSchema, z.number().int().nonnegative()),
});
export type RecruiterJobListResponse = z.infer<typeof recruiterJobListResponseSchema>;
