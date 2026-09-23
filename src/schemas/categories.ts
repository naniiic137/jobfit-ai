/**
 * Skill categories and importance levels, kept free of zod so that the
 * offline analyzer and the UI can use them without loading the validation
 * library (zod is only needed when an LLM answer has to be validated).
 */
export const SKILL_CATEGORIES = [
  'language',
  'frontend',
  'backend',
  'database',
  'devops',
  'ai',
  'tool',
  'practice',
  'soft',
  'other',
] as const;

export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

export const IMPORTANCES = ['required', 'nice'] as const;
export type Importance = (typeof IMPORTANCES)[number];
