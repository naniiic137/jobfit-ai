import { describe, expect, it } from 'vitest';
import { cvFacts, estimateYears, jobFacts } from './facts';

const NOW = new Date('2026-09-01T00:00:00Z');

describe('estimateYears', () => {
  it('prefers an explicit statement', () => {
    expect(estimateYears('I have 4 years of experience in web development', NOW)).toBe(4);
    expect(estimateYears("3 ans d'expérience en développement", NOW)).toBe(3);
  });

  it('sums date ranges under the Experience heading only', () => {
    const cv = `EXPERIENCE
Dev — Acme
01/2024 - Present
Intern — Beta
2022 - 2023
EDUCATION
2018 - 2022`;
    // 2 years 8 months (Jan 2024 → Sep 2026) + 1 year; the degree is ignored.
    expect(estimateYears(cv, NOW)).toBe(3.7);
  });

  it('returns null when nothing is found', () => {
    expect(estimateYears('Hello, I like code.', NOW)).toBeNull();
  });
});

describe('cvFacts', () => {
  it('reads the name, bullets and projects', () => {
    const f = cvFacts(`Amel Karray
Developer
- Built a dashboard with React and a Node.js API
PROJECTS
Weather App — React + OpenWeather
SKILLS
React`, NOW);
    expect(f.name).toBe('Amel Karray');
    expect(f.bullets).toEqual(['Built a dashboard with React and a Node.js API']);
    expect(f.projects).toEqual(['Weather App — React + OpenWeather']);
  });

  it('does not treat a sentence as a name', () => {
    expect(cvFacts('Experienced developer with a passion for clean code.\n').name).toBeNull();
  });
});

describe('jobFacts', () => {
  it('parses "Title at Company"', () => {
    expect(jobFacts('Junior Developer at Nimbus Labs\nRequirements')).toMatchObject({ title: 'Junior Developer', company: 'Nimbus Labs' });
  });
  it('parses key/value lines and French wording', () => {
    const f = jobFacts("Poste : Développeur React\nEntreprise : Carthage Tech\nMinimum 2 ans d'expérience");
    expect(f).toEqual({ title: 'Développeur React', company: 'Carthage Tech', minYears: 2 });
  });
  it('reads "3+ years of experience"', () => {
    expect(jobFacts('Dev\n- 3+ years of professional experience with React').minYears).toBe(3);
  });
});
