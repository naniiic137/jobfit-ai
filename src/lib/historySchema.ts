import { z } from 'zod';
import { AnalysisPayloadSchema, SkillAssessmentSchema, SkillCategorySchema } from '../schemas/analysis';
import type { AnalysisResult } from '../types';

/**
 * Shape of a stored analysis. It reuses the provider contract and adds what
 * `finalize()` computes. Limits that only make sense for raw LLM output are
 * relaxed (an offline result may have no skills; app notes are appended).
 * Loaded lazily by `loadHistory()`.
 */
const count = z.number().int().nonnegative();

export const AnalysisResultSchema = AnalysisPayloadSchema.extend({
  id: z.string().min(1).max(100),
  createdAt: z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid date'),
  language: z.enum(['en', 'fr']),
  provider: z.enum(['offline', 'gemini', 'ollama', 'openai']),
  model: z.string().max(200).nullable(),
  // Results saved before prompt versions existed have no such field.
  promptVersion: z.string().max(40).nullable().default(null),
  skills: z.array(SkillAssessmentSchema.extend({ verified: z.boolean() })).max(60),
  notes: z.array(z.string().max(400)).max(20),
  scoreDetails: z.object({
    score: z.number().min(0).max(100),
    requiredMatched: count,
    requiredTotal: count,
    niceMatched: count,
    niceTotal: count,
  }),
  breakdown: z.array(z.object({ category: SkillCategorySchema, matched: count, total: count })),
  inputKey: z.string().max(40).optional(),
});

/** Keep the valid entries, drop the rest. Never throws. */
export function parseHistory(raw: unknown): AnalysisResult[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    const r = AnalysisResultSchema.safeParse(entry);
    return r.success ? [r.data as AnalysisResult] : [];
  });
}
