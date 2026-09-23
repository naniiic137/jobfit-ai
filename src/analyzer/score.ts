import type { SkillAssessment } from '../schemas/analysis';
import type { CategoryBreakdown, ScoreDetails } from '../types';
import { SKILL_CATEGORIES } from '../schemas/analysis';

export const WEIGHTS = {
  required: 3,
  nice: 1,
  /** Soft skills are real but hard to prove from a CV, so they count half. */
  softMultiplier: 0.5,
} as const;

export function skillWeight(skill: Pick<SkillAssessment, 'importance' | 'category'>): number {
  const base = skill.importance === 'required' ? WEIGHTS.required : WEIGHTS.nice;
  return skill.category === 'soft' ? base * WEIGHTS.softMultiplier : base;
}

/**
 * Weighted coverage of the job's skills by the CV, 0–100.
 * Computed by the app for every provider, so an LLM cannot "decide" a score
 * that contradicts the skills it labelled.
 */
export function computeScore(skills: ReadonlyArray<Pick<SkillAssessment, 'importance' | 'category' | 'inCv'>>): ScoreDetails {
  let total = 0;
  let got = 0;
  const details = { requiredMatched: 0, requiredTotal: 0, niceMatched: 0, niceTotal: 0 };
  for (const s of skills) {
    const w = skillWeight(s);
    total += w;
    if (s.inCv) got += w;
    if (s.importance === 'required') {
      details.requiredTotal++;
      if (s.inCv) details.requiredMatched++;
    } else {
      details.niceTotal++;
      if (s.inCv) details.niceMatched++;
    }
  }
  const score = total === 0 ? 0 : Math.round((got / total) * 100);
  return { score, ...details };
}

export function computeBreakdown(skills: ReadonlyArray<Pick<SkillAssessment, 'category' | 'inCv'>>): CategoryBreakdown[] {
  const map = new Map<string, CategoryBreakdown>();
  for (const s of skills) {
    const row = map.get(s.category) ?? { category: s.category, matched: 0, total: 0 };
    row.total++;
    if (s.inCv) row.matched++;
    map.set(s.category, row);
  }
  // Keep a stable, meaningful order (languages first, soft skills last).
  return SKILL_CATEGORIES.flatMap((c) => (map.has(c) ? [map.get(c)!] : []));
}

export type ScoreBand = 'strong' | 'good' | 'partial' | 'weak';

export function scoreBand(score: number): ScoreBand {
  if (score >= 80) return 'strong';
  if (score >= 60) return 'good';
  if (score >= 40) return 'partial';
  return 'weak';
}
