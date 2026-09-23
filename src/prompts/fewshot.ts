import type { AnalysisPayload } from '../schemas/analysis';

/**
 * One compact worked example. It teaches the model the exact JSON shape and,
 * more importantly, the grounding behaviour:
 *  - evidence is a verbatim quote,
 *  - a missing skill gets inCv:false / evidence:null,
 *  - metrics are placeholders, not invented numbers,
 *  - the gap suggestion is conditional ("only if true").
 * It is validated against the zod schema in the unit tests, so it can never
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
    'Dear Sunny Travel Hiring Team,\n\nI am applying for the Frontend Developer position. I build user-facing features with Vue.js and JavaScript, most recently a booking widget now used on 3 hotel websites.\n\nI also integrated REST APIs with Axios, so I am comfortable connecting a Vue front end to real back-end services. I noticed that unit testing is part of the role; I have not used Jest or Vitest professionally yet and I am keen to learn them quickly.\n\nThank you for your time. I would be glad to walk you through the booking widget.\n\nKind regards,\nLina Haddad',
  interviewQuestions: [
    {
      question: 'How did you structure the state of the booking widget in Vue.js?',
      why: 'Vue.js is the core requirement and your main project uses it.',
      tip: 'Describe the booking widget concretely: components, state, and one problem you solved.',
    },
    {
      question: 'How would you start adding unit tests to an existing Vue component?',
      why: 'Unit testing is required and missing from your CV.',
      tip: 'Be honest that it is new to you, then outline a plan: Vitest + Vue Test Utils, test one component first.',
    },
  ],
};
