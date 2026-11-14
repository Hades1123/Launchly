/* One JSON file per namespace and locale under apps/web/messages/<locale>/. */
import vi_common from '../../messages/vi/common.json';
import vi_layout from '../../messages/vi/layout.json';
import vi_errors from '../../messages/vi/errors.json';
import vi_landing from '../../messages/vi/landing.json';
import vi_auth from '../../messages/vi/auth.json';
import vi_jobs from '../../messages/vi/jobs.json';
import vi_candidate from '../../messages/vi/candidate.json';
import vi_recruiter from '../../messages/vi/recruiter.json';
import vi_admin from '../../messages/vi/admin.json';
import en_common from '../../messages/en/common.json';
import en_layout from '../../messages/en/layout.json';
import en_errors from '../../messages/en/errors.json';
import en_landing from '../../messages/en/landing.json';
import en_auth from '../../messages/en/auth.json';
import en_jobs from '../../messages/en/jobs.json';
import en_candidate from '../../messages/en/candidate.json';
import en_recruiter from '../../messages/en/recruiter.json';
import en_admin from '../../messages/en/admin.json';

const viMessages = {
  common: vi_common,
  layout: vi_layout,
  errors: vi_errors,
  landing: vi_landing,
  auth: vi_auth,
  jobs: vi_jobs,
  candidate: vi_candidate,
  recruiter: vi_recruiter,
  admin: vi_admin,
};
const enMessages = {
  common: en_common,
  layout: en_layout,
  errors: en_errors,
  landing: en_landing,
  auth: en_auth,
  jobs: en_jobs,
  candidate: en_candidate,
  recruiter: en_recruiter,
  admin: en_admin,
};

export type Messages = typeof viMessages;

type Tree = { [key: string]: string | Tree };

/** Fills keys missing from `target` with the fallback's text, so a raw key never shows. */
function withFallback(target: Tree, fallback: Tree): Tree {
  const merged: Tree = { ...fallback };
  for (const [key, value] of Object.entries(target)) {
    const base = fallback[key];
    merged[key] =
      typeof value === 'object' && typeof base === 'object' ? withFallback(value, base) : value;
  }
  return merged;
}

export const catalogues = {
  vi: viMessages,
  // Missing English keys show the Vietnamese text.
  en: withFallback(enMessages, viMessages) as Messages,
};
