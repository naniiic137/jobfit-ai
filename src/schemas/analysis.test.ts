import { describe, expect, it } from 'vitest';
import { AnalysisPayloadSchema, analysisJsonSchema } from './analysis';
import { FEW_SHOT_ANSWER, FEW_SHOT_FR_ANSWER } from '../prompts/fewshot';

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

describe('AnalysisPayloadSchema', () => {
  it('accepts the few-shot examples (so the prompt never teaches an invalid shape)', () => {
    expect(AnalysisPayloadSchema.safeParse(FEW_SHOT_ANSWER).success).toBe(true);
    expect(AnalysisPayloadSchema.safeParse(FEW_SHOT_FR_ANSWER).success).toBe(true);
  });

  it('rejects a missing required field', () => {
    const bad = clone(FEW_SHOT_ANSWER) as Partial<typeof FEW_SHOT_ANSWER>;
    delete bad.coverLetter;
    const r = AnalysisPayloadSchema.safeParse(bad);
    expect(r.success).toBe(false);
    expect(r.error!.issues[0]!.path).toEqual(['coverLetter']);
  });

  it('rejects an invalid importance value', () => {
    const bad = clone(FEW_SHOT_ANSWER);
    (bad.skills[0] as { importance: string }).importance = 'critical';
    expect(AnalysisPayloadSchema.safeParse(bad).success).toBe(false);
  });

  it('coerces an unknown category to "other" instead of failing', () => {
    const odd = clone(FEW_SHOT_ANSWER);
    (odd.skills[0] as { category: string }).category = 'frameworks';
    const r = AnalysisPayloadSchema.parse(odd);
    expect(r.skills[0]!.category).toBe('other');
  });

  it('trims skill names', () => {
    const odd = clone(FEW_SHOT_ANSWER);
    odd.skills[0]!.name = '  Vue.js ';
    expect(AnalysisPayloadSchema.parse(odd).skills[0]!.name).toBe('Vue.js');
  });

  it('rejects an empty skills list and a too-short cover letter', () => {
    const a = clone(FEW_SHOT_ANSWER);
    a.skills = [];
    expect(AnalysisPayloadSchema.safeParse(a).success).toBe(false);
    const b = clone(FEW_SHOT_ANSWER);
    b.coverLetter = 'Hi';
    expect(AnalysisPayloadSchema.safeParse(b).success).toBe(false);
  });
});

describe('analysisJsonSchema', () => {
  it('produces a JSON Schema object listing every top-level field as required', () => {
    const s = analysisJsonSchema();
    expect(s.type).toBe('object');
    expect(s.required).toEqual(
      expect.arrayContaining(['jobTitle', 'company', 'summary', 'skills', 'notes', 'bulletSuggestions', 'coverLetter', 'interviewQuestions']),
    );
    expect(s).not.toHaveProperty('$schema');
    expect(JSON.stringify(s)).toContain('"required","nice"');
  });
});
