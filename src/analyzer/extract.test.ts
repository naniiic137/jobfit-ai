import { describe, expect, it } from 'vitest';
import { extractSkills, normalize, snippetAt } from './extract';

const ids = (text: string) => extractSkills(text).map((s) => s.def.id);

describe('normalize', () => {
  it('lower-cases, strips accents and unifies quotes/dashes', () => {
    expect(normalize('Expérience — Travail d’équipe')).toBe("experience - travail d'equipe");
  });
  it('keeps the string length so indexes map back to the original text', () => {
    const s = 'Développeur Réact – Sénior';
    expect(normalize(s)).toHaveLength(s.length);
  });
});

describe('extractSkills', () => {
  it('finds skills with special characters', () => {
    expect(ids('C++, C# and .NET developer; CI/CD with GitHub Actions')).toEqual(expect.arrayContaining(['cpp', 'csharp', 'dotnet', 'cicd']));
  });

  it('does not confuse Java with JavaScript', () => {
    expect(ids('Strong JavaScript skills')).toEqual(['javascript']);
    expect(ids('Java 17 and Spring Boot')).toEqual(expect.arrayContaining(['java', 'spring']));
  });

  it('matches Node.js once and does not read "js" out of it', () => {
    const found = ids('Backend in Node.js');
    expect(found).toContain('nodejs');
    expect(found).not.toContain('javascript');
  });

  it('recognises aliases and spelling variants', () => {
    expect(ids('ReactJS, Postgres, K8s, Mongo')).toEqual(['react', 'postgresql', 'kubernetes', 'mongodb']);
  });

  it('understands French synonyms (with or without accents)', () => {
    const found = ids("Travail en équipe, tests unitaires, intégration continue et méthodes agiles. Apprentissage automatique.");
    expect(found).toEqual(expect.arrayContaining(['teamwork', 'testing', 'cicd', 'agile', 'ml']));
  });

  it('only accepts ambiguous words like "Go" in a technical context', () => {
    expect(ids('Go ahead and apply today!')).not.toContain('go');
    expect(ids('Languages: Python, Go, Rust')).toEqual(expect.arrayContaining(['python', 'go', 'rust']));
    expect(ids('We want you to express your ideas')).not.toContain('express');
  });

  it('does not match words inside other words', () => {
    expect(ids('reactive programming and nodes')).toEqual([]);
  });

  it('returns skills in order of first mention with every hit', () => {
    const res = extractSkills('Docker. Later: React and more Docker');
    expect(res.map((r) => r.def.id)).toEqual(['docker', 'react']);
    expect(res[0]!.hits).toHaveLength(2);
    expect(res[0]!.hits[0]!.surface).toBe('Docker');
  });
});

describe('snippetAt', () => {
  it('returns the whole bullet line without the bullet marker', () => {
    const cv = 'Header\n- Built a REST API with Express\nFooter';
    expect(snippetAt(cv, cv.indexOf('Express'))).toBe('Built a REST API with Express');
  });

  it('shortens long lines around the hit with ellipses', () => {
    const long = `${'x '.repeat(80)}React${' y'.repeat(80)}`;
    const s = snippetAt(long, long.indexOf('React'), 60);
    expect(s).toContain('React');
    expect(s.startsWith('…')).toBe(true);
    expect(s.endsWith('…')).toBe(true);
  });
});
