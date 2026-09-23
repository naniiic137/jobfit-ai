import { describe, expect, it } from 'vitest';
import { classifyHeading, detectSections, importanceFor } from './sections';
import { jobSkills } from './offline';

describe('classifyHeading', () => {
  it.each([
    ['Requirements', 'required'],
    ['## Must have', 'required'],
    ['What you bring:', 'required'],
    ['Profil recherché', 'required'],
    ['Compétences requises :', 'required'],
    ['Nice to have', 'nice'],
    ['Bonus points', 'nice'],
    ['Atouts', 'nice'],
    ["What you'll do", 'responsibilities'],
    ['Vos missions', 'responsibilities'],
    ['What we offer', 'benefits'],
    ['Avantages', 'benefits'],
    ['About us', 'company'],
  ])('%s → %s', (line, kind) => {
    expect(classifyHeading(line)).toBe(kind);
  });

  it('ignores sentences, bullets and key/value lines', () => {
    expect(classifyHeading('- Strong skills in React and TypeScript.')).toBeNull();
    expect(classifyHeading('We are a team of engineers who love requirements engineering and clean code.')).toBeNull();
    expect(classifyHeading('Company: Nimbus Labs')).toBeNull();
  });
});

describe('detectSections', () => {
  it('splits an ad into ordered sections with offsets', () => {
    const ad = 'Dev at Acme\nIntro text\nRequirements\n- React\nNice to have\n- Docker\nWhat we offer\n- Laptop';
    const kinds = detectSections(ad).map((s) => s.kind);
    expect(kinds).toEqual(['intro', 'required', 'nice', 'benefits']);
    const nice = detectSections(ad).find((s) => s.kind === 'nice')!;
    expect(ad.slice(nice.start, nice.end)).toContain('Docker');
  });
});

describe('importanceFor', () => {
  it('uses inline markers over the section', () => {
    expect(importanceFor('required', '- Docker is a plus')).toBe('nice');
    expect(importanceFor('required', '- Next.js serait un plus')).toBe('nice');
    expect(importanceFor('required', '- React')).toBe('required');
  });
  it('ignores benefits and softens the company blurb', () => {
    expect(importanceFor('benefits', '- Free AWS courses')).toBeNull();
    expect(importanceFor('company', 'We build with Go and React')).toBe('nice');
  });
});

describe('jobSkills (section-aware extraction)', () => {
  const ad = `Frontend Developer at Acme
Requirements:
- React and TypeScript
- Docker is a plus
Nice to have:
- GraphQL
What we offer:
- Kubernetes training budget
Requirements again? No — but React also appears here in a nice-to-have context: React Native is a bonus`;

  it('labels required vs nice-to-have and drops perks', () => {
    const skills = Object.fromEntries(jobSkills(ad).map((s) => [s.id, s.importance]));
    expect(skills.react).toBe('required');
    expect(skills.typescript).toBe('required');
    expect(skills.docker).toBe('nice');
    expect(skills.graphql).toBe('nice');
    expect(skills.kubernetes).toBeUndefined();
  });

  it('keeps the strongest importance when a skill appears in several sections', () => {
    const s = jobSkills('Nice to have:\n- React\nRequirements:\n- React');
    expect(s.find((x) => x.id === 'react')!.importance).toBe('required');
  });
});
