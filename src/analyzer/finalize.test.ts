import { describe, expect, it } from 'vitest';
import { dedupeSkills, evidenceInCv, finalize, verifySkills } from './finalize';
import type { AnalysisPayload, SkillAssessment } from '../schemas/analysis';

const CV = `Nour Mansour
- Built a “click & collect” feature in React for 12 stores
- Wrote SQL reports for the finance team`;

const skill = (p: Partial<SkillAssessment>): SkillAssessment => ({ name: 'React', category: 'frontend', importance: 'required', inCv: true, evidence: null, ...p });

describe('evidenceInCv', () => {
  it('accepts verbatim quotes, ignoring case, quotes and whitespace', () => {
    expect(evidenceInCv('built a "click & collect" feature in react', CV)).toBe(true);
  });
  it('accepts quotes shortened with an ellipsis', () => {
    expect(evidenceInCv('Built a … feature in React for 12 stores', CV)).toBe(true);
  });
  it('rejects invented evidence', () => {
    expect(evidenceInCv('Led a team of 5 React developers', CV)).toBe(false);
  });
});

describe('verifySkills', () => {
  it('flags an LLM claim that the CV cannot back up', () => {
    const [docker] = verifySkills([skill({ name: 'Docker', category: 'devops', evidence: 'Deployed with Docker on AWS' })], CV);
    expect(docker!.verified).toBe(false);
  });
  it('trusts the taxonomy when the quote is missing but the skill is in the CV', () => {
    const [sql] = verifySkills([skill({ name: 'SQL', category: 'database', evidence: null })], CV);
    expect(sql!.verified).toBe(true);
  });
  it('treats missing skills as verified (nothing to prove)', () => {
    const [x] = verifySkills([skill({ name: 'Kubernetes', inCv: false })], CV);
    expect(x!.verified).toBe(true);
  });
});

describe('dedupeSkills', () => {
  it('merges duplicates and keeps the strongest signal', () => {
    const out = dedupeSkills([
      skill({ name: 'React', importance: 'nice', inCv: false }),
      skill({ name: 'react', importance: 'required', inCv: true, evidence: 'x' }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ importance: 'required', inCv: true, evidence: 'x' });
  });
});

describe('finalize', () => {
  const payload: AnalysisPayload = {
    jobTitle: 'Dev',
    company: null,
    summary: 'ok',
    skills: [
      skill({ name: 'React', evidence: 'feature in React for 12 stores' }),
      skill({ name: 'Docker', category: 'devops', evidence: 'Docker in production' }), // hallucinated
      skill({ name: 'GraphQL', category: 'backend', inCv: false, importance: 'nice' }),
    ],
    notes: [],
    bulletSuggestions: [],
    coverLetter: 'x'.repeat(100),
    interviewQuestions: [{ question: 'q', why: 'w', tip: 't' }],
  };

  it('computes the score itself and gives no credit for unverified matches', () => {
    const r = finalize(payload, { cv: CV, language: 'en', provider: 'gemini', model: 'm', now: new Date('2026-01-01') });
    // React (3) matched; Docker (3) unverified → not counted; GraphQL (1) missing → 3/7
    expect(r.scoreDetails.score).toBe(43);
    expect(r.skills.find((s) => s.name === 'Docker')!.verified).toBe(false);
    expect(r.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(r.provider).toBe('gemini');
  });
});
