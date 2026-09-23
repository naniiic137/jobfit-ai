import { z } from 'zod';
import { IMPORTANCES, SKILL_CATEGORIES } from './categories';

// No `new Function` probe or JIT: the site's CSP forbids eval (and would report the probe).
z.config({ jitless: true });

/**
 * The single contract every provider must satisfy.
 * - The offline analyzer builds it deterministically.
 * - LLM providers are asked to return exactly this shape as JSON, and their
 *   output is validated with `AnalysisPayloadSchema` before it reaches the UI.
 *
 * Note that there is no `score` here on purpose: the match score is computed
 * by the app (see `analyzer/score.ts`) from the labelled skills, so it is
 * consistent and explainable no matter which provider produced the labels.
 */

export { SKILL_CATEGORIES, IMPORTANCES } from './categories';

export const SkillCategorySchema = z.enum(SKILL_CATEGORIES);
export type SkillCategory = z.infer<typeof SkillCategorySchema>;

export const ImportanceSchema = z.enum(IMPORTANCES);
export type Importance = z.infer<typeof ImportanceSchema>;

export const SkillAssessmentSchema = z.object({
  name: z.string().trim().min(1).max(60),
  category: SkillCategorySchema.catch('other'),
  importance: ImportanceSchema,
  inCv: z.boolean(),
  /** A short quote from the CV that proves the skill. null when inCv is false. */
  evidence: z.string().max(300).nullable(),
});
export type SkillAssessment = z.infer<typeof SkillAssessmentSchema>;

export const BulletSuggestionSchema = z.object({
  /** The CV line being improved, or null for a brand-new line (gap advice). */
  original: z.string().max(400).nullable(),
  suggestion: z.string().min(1).max(500),
  reason: z.string().min(1).max(300),
});
export type BulletSuggestion = z.infer<typeof BulletSuggestionSchema>;

export const InterviewQuestionSchema = z.object({
  question: z.string().min(1).max(300),
  why: z.string().min(1).max(300),
  tip: z.string().min(1).max(400),
});
export type InterviewQuestion = z.infer<typeof InterviewQuestionSchema>;

export const AnalysisPayloadSchema = z.object({
  jobTitle: z.string().max(120).nullable(),
  company: z.string().max(120).nullable(),
  summary: z.string().min(1).max(800),
  skills: z.array(SkillAssessmentSchema).min(1).max(60),
  notes: z.array(z.string().max(300)).max(8),
  bulletSuggestions: z.array(BulletSuggestionSchema).max(10),
  coverLetter: z.string().min(80).max(5000),
  interviewQuestions: z.array(InterviewQuestionSchema).min(1).max(12),
});
export type AnalysisPayload = z.infer<typeof AnalysisPayloadSchema>;

/** JSON Schema handed to providers that support constrained decoding. */
export const analysisJsonSchema = (): Record<string, unknown> => {
  const schema = z.toJSONSchema(AnalysisPayloadSchema, { io: 'input', target: 'draft-7' }) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
};
