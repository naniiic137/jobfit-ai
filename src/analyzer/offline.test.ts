import { describe, expect, it } from 'vitest';
import { analyzeOffline, buildContext, cvSkillMap, improveBullet } from './offline';
import { finalize } from './finalize';
import { SAMPLE_CV, SAMPLE_JOB } from '../data/samples';
import { AnalysisPayloadSchema } from '../schemas/analysis';

const NOW = new Date('2026-09-23T10:00:00Z');

describe('analyzeOffline on the bundled sample', () => {
  const payload = analyzeOffline(SAMPLE_CV, SAMPLE_JOB, 'en', NOW);
  const byName = Object.fromEntries(payload.skills.map((s) => [s.name, s]));

  it('produces a payload that satisfies the same schema as LLM output', () => {
    expect(AnalysisPayloadSchema.safeParse(payload).success).toBe(true);
  });

  it('reads the job title and company', () => {
    expect(payload.jobTitle).toBe('Junior Full-Stack Developer (React / Node.js)');
    expect(payload.company).toBe('Nimbus Labs');
  });

  it('labels matched and missing skills with the right importance', () => {
    expect(byName['React']).toMatchObject({ inCv: true, importance: 'required' });
    expect(byName['TypeScript']).toMatchObject({ inCv: true, importance: 'required' });
    expect(byName['PostgreSQL']).toMatchObject({ inCv: false, importance: 'required' });
    expect(byName['Docker']).toMatchObject({ inCv: false, importance: 'required' });
    expect(byName['Next.js']).toMatchObject({ inCv: false, importance: 'nice' });
    expect(byName['LLMs']).toMatchObject({ importance: 'nice' });
  });

  it('ignores perks in "What we offer"', () => {
    expect(payload.skills.map((s) => s.name)).not.toContain('Health insurance');
  });

  it('credits SQL through MySQL and quotes real CV text as evidence', () => {
    expect(byName['SQL']!.inCv).toBe(true);
    for (const s of payload.skills.filter((x) => x.inCv)) {
      const quote = s.evidence!.replace(/…/g, '');
      expect(SAMPLE_CV).toContain(quote.trim());
    }
  });

  it('prefers bullet points over the skills list as evidence', () => {
    expect(byName['React']!.evidence).toMatch(/^Worked on the customer dashboard/);
  });

  it('scores the sample as a partial-to-good match', () => {
    const r = finalize(payload, { cv: SAMPLE_CV, language: 'en', provider: 'offline', model: null });
    expect(r.scoreDetails.score).toBeGreaterThanOrEqual(55);
    expect(r.scoreDetails.score).toBeLessThanOrEqual(80);
  });

  it('never claims missing skills in the cover letter', () => {
    const usedSentence = payload.coverLetter.split('\n').find((l) => l.includes('I have used'))!;
    expect(usedSentence).toBeDefined();
    for (const missing of ['PostgreSQL', 'Docker', 'Next.js', 'AWS']) expect(usedSentence).not.toContain(missing);
    expect(payload.coverLetter).toMatch(/not used them professionally yet/);
    expect(payload.coverLetter).toContain('Sami Ben Salah');
  });

  it('suggests metrics as placeholders instead of inventing numbers', () => {
    const withPlaceholder = payload.bulletSuggestions.filter((b) => b.suggestion.includes('[add a real result'));
    expect(withPlaceholder.length).toBeGreaterThan(0);
    // A bullet that already has a number gets no placeholder.
    const dashboard = payload.bulletSuggestions.find((b) => b.original?.includes('40 partner shops'))!;
    expect(dashboard.suggestion).not.toContain('[');
  });

  it('mirrors the ad wording and strengthens weak verbs', () => {
    const dashboard = payload.bulletSuggestions.find((b) => b.original?.includes('dashboard'))!;
    expect(dashboard.suggestion).toBe('Developed the customer dashboard in React and TypeScript used by 40 partner shops');
  });

  it('adds conditional advice for required gaps', () => {
    const gaps = payload.bulletSuggestions.filter((b) => b.original === null);
    expect(gaps.map((g) => g.reason).join(' ')).toContain('PostgreSQL');
    expect(gaps.every((g) => g.suggestion.startsWith('Only if true'))).toBe(true);
  });

  it('builds interview questions from matched skills, gaps and projects', () => {
    const qs = payload.interviewQuestions.map((q) => q.question).join('\n');
    expect(qs).toMatch(/React/);
    expect(qs).toMatch(/PostgreSQL|Docker/);
    expect(qs).toMatch(/Recipe Finder/);
    expect(qs).toMatch(/Nimbus Labs/);
  });
});

describe('French output', () => {
  const fr = analyzeOffline(SAMPLE_CV, SAMPLE_JOB, 'fr', NOW);
  it('writes the generated text in French', () => {
    expect(fr.summary).toMatch(/compétences requises/);
    expect(fr.coverLetter).toMatch(/^Madame, Monsieur/);
    expect(fr.coverLetter).toMatch(/Je ne les ai pas encore utilisés/);
    expect(fr.interviewQuestions.at(-1)!.question).toMatch(/Pourquoi voulez-vous rejoindre Nimbus Labs/);
  });
});

describe('French job ad', () => {
  const ad = `Développeur Full-Stack – Carthage Digital (Tunis)
Profil recherché :
- Maîtrise de React et Node.js
- Bonne connaissance des bases de données relationnelles (PostgreSQL)
- Travail en équipe et autonomie
Atouts :
- Docker
- Expérience avec les API REST`;
  it('detects French sections and synonyms', () => {
    const p = analyzeOffline(SAMPLE_CV, ad, 'fr', NOW);
    const imp = Object.fromEntries(p.skills.map((s) => [s.name, s.importance]));
    expect(imp).toMatchObject({ React: 'required', 'Node.js': 'required', PostgreSQL: 'required', Teamwork: 'required', Autonomy: 'required', Docker: 'nice' });
    expect(p.company).toBe('Carthage Digital');
  });
});

describe('helpers', () => {
  it('cvSkillMap adds implied skills with the evidence of the specific one', () => {
    const map = cvSkillMap('- Built APIs with NestJS');
    expect([...map.keys()]).toEqual(expect.arrayContaining(['nestjs', 'nodejs', 'typescript', 'javascript']));
  });

  it('improveBullet leaves a strong, quantified, correctly-worded bullet alone', () => {
    const ctx = buildContext(SAMPLE_CV, SAMPLE_JOB, 'en', NOW);
    expect(improveBullet('Built 3 React apps used by 200 users', ctx)).toBeNull();
  });

  it('handles an ad with no recognisable skills', () => {
    const p = analyzeOffline(SAMPLE_CV, 'We need a great person to join us. Apply now please thanks.', 'en', NOW);
    expect(p.skills).toEqual([]);
    expect(p.summary).toMatch(/No known skills/);
  });
});
