import { describe, expect, it } from 'vitest';
import { cvSkillMap, extractSkills, isSpellingOf, maskPersonalInfo, normalize, snippetAt } from './extract';

const ids = (text: string) => extractSkills(text).map((s) => s.def.id);

const NL = String.fromCharCode(10);

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

describe('different products stay different skills', () => {
  it.each([
    ['Built the store with Zustand', ['zustand'], ['redux']],
    ['Trained models with TensorFlow and Keras', ['tensorflow', 'keras'], ['pytorch']],
    ['Deployed through GitLab CI', ['gitlab-ci'], ['git', 'gitlab', 'cicd']],
    ['Code hosted on GitHub and Bitbucket', ['github', 'bitbucket'], ['git']],
    ['Wrote Helm charts', ['helm'], ['kubernetes']],
    ['Designed real-time KPI reports (temps réel)', [], ['websockets']],
    ['Tickets in Confluence and Trello', ['confluence', 'trello'], ['jira']],
    ['Documented the API with Swagger', ['openapi'], ['postman']],
    ['Monorepo with yarn and pnpm', ['yarn', 'pnpm'], ['npm']],
    ['Centralised logging for the API', [], ['monitoring']],
    ['Deployed on Firebase Hosting', ['firebase'], ['gcp']],
    ['Jest and Cypress tests', ['jest', 'cypress', 'testing'].slice(0, 2), ['playwright']],
  ])('%s', (text, present, absent) => {
    const found = ids(text);
    expect(found).toEqual(expect.arrayContaining(present));
    for (const a of absent) expect(found).not.toContain(a);
  });

  it('keeps true implications on the CV side only (Helm ⇒ Kubernetes, not the reverse)', () => {
    expect([...cvSkillMap('- Wrote Helm charts').keys()]).toContain('kubernetes');
    expect([...cvSkillMap('- Ran Kubernetes clusters').keys()]).not.toContain('helm');
    expect([...cvSkillMap('- Built the store with Zustand').keys()]).not.toContain('redux');
    expect([...cvSkillMap('- Code on GitHub').keys()]).toContain('git');
  });

  it('lets the longer mention win when two skills overlap', () => {
    const found = ids('CI/CD with GitHub Actions; mobile app in React Native');
    expect(found).toEqual(expect.arrayContaining(['cicd', 'github-actions', 'react-native']));
    expect(found).not.toContain('github');
    expect(found).not.toContain('react');
  });
});

describe('ambiguous LLM names', () => {
  it('does not read people or star signs as models', () => {
    expect(ids('Claude Martin' + NL + 'Marketing analyst')).toEqual([]);
    expect(ids('Worked with Claude and Gemini on the design team')).toEqual([]);
    expect(ids('Meeting notes for Llama Farms Ltd')).toEqual([]);
  });

  it('accepts them with a technical context or a version', () => {
    expect(ids('Built a support chatbot with the Claude API')).toContain('claude');
    expect(ids('Fine-tuned Llama 3 on support tickets')).toContain('llama');
    expect(ids('Prompting GPT-4o and Gemini models via the API')).toEqual(expect.arrayContaining(['openai', 'gemini']));
    expect(ids('Worked with GPT for summaries')).not.toContain('openai');
  });

  it('is case-sensitive', () => {
    expect(ids('claude and gemini are my cats, they love llama toys')).toEqual([]);
  });
});

describe('CV header', () => {
  const cv = ['Claude Martin', 'claude.martin@example.com · github.com/claude-go · www.gemini-portfolio.dev', 'EXPERIENCE', '- Built REST APIs with Socket.io'].join(NL);
  it('masks the name, e-mails and URLs but keeps the length', () => {
    const masked = maskPersonalInfo(cv);
    expect(masked).toHaveLength(cv.length);
    expect(masked).not.toMatch(/Claude|github|gemini/i);
    expect(masked).toContain('Socket.io');
  });
  it('never turns the header into skills', () => {
    const found = [...cvSkillMap(cv).keys()];
    expect(found).toEqual(expect.arrayContaining(['rest', 'socketio']));
    for (const id of ['claude', 'llm', 'github', 'git', 'go', 'gemini']) expect(found).not.toContain(id);
  });
});

describe('REST', () => {
  it('recognises bare "REST" (case-sensitive) and not the word "rest"', () => {
    expect(ids('Java, Spring Boot, Hibernate/JPA, PostgreSQL, REST')).toContain('rest');
    expect(ids('REST and GraphQL APIs')).toContain('rest');
    expect(ids('Take some rest after the release')).not.toContain('rest');
  });
});

describe('isSpellingOf', () => {
  it('knows spelling variants apart from aliases', () => {
    expect(isSpellingOf('react', 'ReactJS')).toBe(true);
    expect(isSpellingOf('react', 'React.js')).toBe(true);
    expect(isSpellingOf('java', 'Java 17')).toBe(false);
    expect(isSpellingOf('git', 'GitLab')).toBe(false);
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
