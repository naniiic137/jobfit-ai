import type { AnalysisPayload } from '../schemas/analysis';
import type { OutputLanguage } from '../types';

/**
 * One compact worked example per output language. It teaches the model the exact JSON shape and,
 * more importantly, the grounding behaviour:
 *  - evidence is a verbatim quote,
 *  - a missing skill gets inCv:false / evidence:null,
 *  - metrics are placeholders, not invented numbers,
 *  - the gap suggestion is conditional ("only if true").
 * The example in the requested language is used, so the model also sees the
 * tone and wording to use (a French letter opens with "Madame, Monsieur,").
 * Both are validated against the zod schema in the unit tests, so they can never
 * drift out of sync with what the app accepts.
 */
export const FEW_SHOT_CV = `Lina Haddad
Frontend developer
- Built a booking widget in Vue.js used on 3 hotel websites
- Worked on REST API integration with Axios
Skills: Vue.js, JavaScript, CSS, Git`;

export const FEW_SHOT_JOB = `Frontend Developer at Sunny Travel
Requirements:
- Vue.js and JavaScript
- Unit testing (Jest or Vitest)
Nice to have: TypeScript`;

export const FEW_SHOT_ANSWER: AnalysisPayload = {
  jobTitle: 'Frontend Developer',
  company: 'Sunny Travel',
  summary:
    'Good fit on the core stack: the CV shows Vue.js and JavaScript in real projects. The main gap is unit testing, which is required, and TypeScript is a nice-to-have that is missing.',
  skills: [
    { name: 'Vue.js', category: 'frontend', importance: 'required', inCv: true, evidence: 'Built a booking widget in Vue.js used on 3 hotel websites' },
    { name: 'JavaScript', category: 'language', importance: 'required', inCv: true, evidence: 'Skills: Vue.js, JavaScript, CSS, Git' },
    { name: 'Unit testing', category: 'practice', importance: 'required', inCv: false, evidence: null },
    { name: 'TypeScript', category: 'language', importance: 'nice', inCv: false, evidence: null },
  ],
  notes: ['Lead with the booking widget: it is the strongest proof of Vue.js in production.'],
  bulletSuggestions: [
    {
      original: 'Worked on REST API integration with Axios',
      suggestion: 'Integrated REST APIs with Axios in the booking widget — [add a real result, e.g. number of bookings or load time]',
      reason: 'Stronger action verb, ties the work to the flagship project, and asks for a real metric instead of inventing one.',
    },
    {
      original: null,
      suggestion: 'Only if true: add a line such as "Wrote unit tests with Jest/Vitest for …". If you have not written tests yet, add a few to the booking widget first.',
      reason: 'Unit testing is required by the ad and does not appear in the CV.',
    },
  ],
  coverLetter:
    'Dear Sunny Travel Hiring Team,\n\nI am applying for the Frontend Developer position. I build user-facing features with Vue.js and JavaScript, most recently a booking widget now used on 3 hotel websites.\n\nI also integrated REST APIs with Axios, so I am comfortable connecting a Vue front end to real back-end services. Unit testing with Jest or Vitest is also part of the role, and it is an area I am keen to strengthen quickly.\n\nThank you for your time. I would be glad to walk you through the booking widget.\n\nKind regards,\nLina Haddad',
  interviewQuestions: [
    {
      question: 'How did you structure the state of the booking widget in Vue.js?',
      why: 'Vue.js is the core requirement and your main project uses it.',
      tip: 'Describe the booking widget concretely: components, state, and one problem you solved.',
    },
    {
      question: 'How would you start adding unit tests to an existing Vue component?',
      why: 'Unit testing is required and missing from your CV.',
      tip: 'If it is new to you, say so honestly, then outline a plan: Vitest + Vue Test Utils, test one component first.',
    },
  ],
};

export const FEW_SHOT_FR_CV = `Karim Jaziri
Développeur back-end
- Développement d'une API REST en Node.js et Express pour une application de livraison
- Travaillé sur les requêtes SQL des tableaux de bord
Compétences : Node.js, Express, MySQL, Git`;

export const FEW_SHOT_FR_JOB = `Développeur Back-End – Colis Express (Sousse)
Profil recherché :
- Node.js et Express
- Docker
Atouts : TypeScript`;

export const FEW_SHOT_FR_ANSWER: AnalysisPayload = {
  jobTitle: 'Développeur Back-End',
  company: 'Colis Express',
  summary:
    'Bonne adéquation sur le cœur du poste : le CV montre Node.js et Express dans un vrai projet. Docker, exigé, n’apparaît pas, et TypeScript est un atout absent du CV.',
  skills: [
    { name: 'Node.js', category: 'backend', importance: 'required', inCv: true, evidence: "Développement d'une API REST en Node.js et Express pour une application de livraison" },
    { name: 'Express', category: 'backend', importance: 'required', inCv: true, evidence: "Développement d'une API REST en Node.js et Express" },
    { name: 'Docker', category: 'devops', importance: 'required', inCv: false, evidence: null },
    { name: 'TypeScript', category: 'language', importance: 'nice', inCv: false, evidence: null },
  ],
  notes: ['Mettez en avant l’API de livraison : c’est la preuve la plus concrète de Node.js et Express.'],
  bulletSuggestions: [
    {
      original: 'Travaillé sur les requêtes SQL des tableaux de bord',
      suggestion: 'Conçu les requêtes SQL des tableaux de bord — [ajoutez un résultat réel, ex. temps de chargement ou nombre d’utilisateurs]',
      reason: 'Verbe d’action plus fort, et un emplacement pour un chiffre réel au lieu d’en inventer un.',
    },
    {
      original: null,
      suggestion: 'Seulement si c’est vrai : ajoutez une ligne comme « Conteneurisé l’API avec Docker pour … ». Sinon, conteneurisez d’abord l’API de livraison.',
      reason: 'Docker est exigé par l’annonce et n’apparaît pas dans le CV.',
    },
  ],
  coverLetter:
    'Madame, Monsieur,\n\nJe vous adresse ma candidature pour le poste de Développeur Back-End chez Colis Express. Je développe des services back-end en Node.js et Express, en dernier lieu une API REST pour une application de livraison.\n\nJ’ai également travaillé sur les requêtes SQL des tableaux de bord, ce qui m’a appris à relier une API à des données réelles. Le poste implique aussi Docker : c’est un domaine dans lequel je souhaite progresser rapidement.\n\nJe me tiens à votre disposition pour vous présenter l’API de livraison.\n\nJe vous prie d’agréer, Madame, Monsieur, l’expression de mes salutations distinguées.\nKarim Jaziri',
  interviewQuestions: [
    {
      question: 'Comment avez-vous structuré les routes et la gestion d’erreurs de l’API de livraison ?',
      why: 'Node.js et Express sont au cœur du poste et votre projet principal les utilise.',
      tip: 'Décrivez l’API concrètement : routes, validation, et un problème que vous avez résolu.',
    },
    {
      question: 'Comment conteneuriseriez-vous une API Node.js avec Docker ?',
      why: 'Docker est exigé et n’apparaît pas dans votre CV.',
      tip: 'Si c’est nouveau pour vous, dites-le franchement, puis donnez un plan : Dockerfile, image légère, docker compose avec la base.',
    },
  ],
};

export interface FewShotExample {
  cv: string;
  job: string;
  answer: AnalysisPayload;
}

/** The worked example written in the requested output language. */
export function fewShotFor(lang: OutputLanguage): FewShotExample {
  return lang === 'fr'
    ? { cv: FEW_SHOT_FR_CV, job: FEW_SHOT_FR_JOB, answer: FEW_SHOT_FR_ANSWER }
    : { cv: FEW_SHOT_CV, job: FEW_SHOT_JOB, answer: FEW_SHOT_ANSWER };
}
