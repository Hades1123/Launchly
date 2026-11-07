import type { CareerLevel } from '@/components/jobs/mock-jobs';
import type { BadgeTone } from '@/components/ui/badge';

/** Career level badge colours from the design system: Intern indigo, Fresher emerald. */
export const levelTone: Record<CareerLevel, BadgeTone> = {
  Intern: 'primary',
  Fresher: 'success',
  Junior: 'neutral',
};
