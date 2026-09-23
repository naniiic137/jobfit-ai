import { describe, expect, it } from 'vitest';
import { computeBreakdown, computeScore, scoreBand, skillWeight, WEIGHTS } from './score';
import type { SkillAssessment } from '../schemas/analysis';

const s = (p: Partial<SkillAssessment>): SkillAssessment => ({
  name: 'X',
  category: 'frontend',
  importance: 'required',
  inCv: false,
  evidence: null,
  ...p,
});

describe('skillWeight', () => {
  it('weights required > nice and halves soft skills', () => {
    expect(skillWeight(s({}))).toBe(WEIGHTS.required);
    expect(skillWeight(s({ importance: 'nice' }))).toBe(WEIGHTS.nice);
    expect(skillWeight(s({ category: 'soft' }))).toBe(WEIGHTS.required * WEIGHTS.softMultiplier);
  });
});

describe('computeScore', () => {
  it('is 0 with no skills and 100 with all matched', () => {
    expect(computeScore([]).score).toBe(0);
    expect(computeScore([s({ inCv: true }), s({ importance: 'nice', inCv: true })]).score).toBe(100);
  });

  it('is a weighted coverage', () => {
    // required matched (3) + nice missing (1) → 3/4
    expect(computeScore([s({ inCv: true }), s({ importance: 'nice' })]).score).toBe(75);
    // required missing (3) + nice matched (1) → 1/4
    expect(computeScore([s({}), s({ importance: 'nice', inCv: true })]).score).toBe(25);
  });

  it('counts required and nice-to-have separately', () => {
    const d = computeScore([s({ inCv: true }), s({}), s({ importance: 'nice', inCv: true })]);
    expect(d).toMatchObject({ requiredMatched: 1, requiredTotal: 2, niceMatched: 1, niceTotal: 1 });
  });

  it('missing a required skill costs more than missing a nice-to-have', () => {
    const missRequired = computeScore([s({}), s({ importance: 'nice', inCv: true }), s({ inCv: true })]).score;
    const missNice = computeScore([s({ inCv: true }), s({ importance: 'nice' }), s({ inCv: true })]).score;
    expect(missNice).toBeGreaterThan(missRequired);
  });
});

describe('computeBreakdown', () => {
  it('groups by category in a stable order', () => {
    const b = computeBreakdown([
      s({ category: 'soft', inCv: true }),
      s({ category: 'language', inCv: true }),
      s({ category: 'language' }),
    ]);
    expect(b).toEqual([
      { category: 'language', matched: 1, total: 2 },
      { category: 'soft', matched: 1, total: 1 },
    ]);
  });
});

describe('scoreBand', () => {
  it('maps scores to bands', () => {
    expect([90, 65, 45, 10].map(scoreBand)).toEqual(['strong', 'good', 'partial', 'weak']);
  });
});
