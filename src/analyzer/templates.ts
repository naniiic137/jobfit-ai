import type { OutputLanguage } from '../types';

/**
 * All user-facing strings of the offline analyzer, in English and French.
 * Keeping them in one table makes the "template" nature of offline mode explicit
 * and keeps the logic in `offline.ts` language-agnostic.
 */

type Dict = Record<OutputLanguage, string>;

export const T = {
  weakVerb: { en: 'Starts with a strong action verb instead of a passive phrase.', fr: 'Commence par un verbe d’action fort plutôt qu’une formule passive.' },
  mirror: { en: 'Uses the exact wording of the job ad ({terms}) so keyword filters (ATS) and recruiters spot it.', fr: 'Reprend les termes exacts de l’annonce ({terms}) pour les filtres ATS et les recruteurs.' },
  quantify: { en: 'Add a real, measurable result — only numbers you can back up.', fr: 'Ajoutez un résultat mesurable réel — uniquement des chiffres que vous pouvez justifier.' },
  quantifyPlaceholder: { en: ' — [add a real result: users, time saved, % faster]', fr: ' — [ajoutez un résultat réel : utilisateurs, temps gagné, % plus rapide]' },
  frontload: { en: 'Moves the most relevant skill for this job ({skill}) to the front.', fr: 'Met en avant la compétence la plus pertinente pour ce poste ({skill}).' },
  gapSuggestion: {
    en: 'Only if true: add a line showing hands-on use of {skill}, e.g. “Used {skill} to … in [project], which …”. If you have not used it yet, a small practice project is the honest fix.',
    fr: 'Seulement si c’est vrai : ajoutez une ligne montrant une utilisation concrète de {skill}, ex. « Utilisé {skill} pour … dans [projet], ce qui … ». Sinon, un petit projet d’entraînement est la solution honnête.',
  },
  gapReason: { en: '“{skill}” is required by the ad but was not found in your CV.', fr: '« {skill} » est exigé par l’annonce mais n’apparaît pas dans votre CV.' },
  niceGapReason: { en: '“{skill}” is a nice-to-have in the ad and missing from your CV.', fr: '« {skill} » est un atout dans l’annonce et n’apparaît pas dans votre CV.' },

  summary_strong: { en: 'Strong match: your CV covers {req} of {reqTotal} required skills{nice}.', fr: 'Très bonne correspondance : votre CV couvre {req} des {reqTotal} compétences requises{nice}.' },
  summary_good: { en: 'Good match: your CV covers {req} of {reqTotal} required skills{nice}.', fr: 'Bonne correspondance : votre CV couvre {req} des {reqTotal} compétences requises{nice}.' },
  summary_partial: { en: 'Partial match: your CV covers {req} of {reqTotal} required skills{nice}.', fr: 'Correspondance partielle : votre CV couvre {req} des {reqTotal} compétences requises{nice}.' },
  summary_weak: { en: 'Weak match: your CV covers {req} of {reqTotal} required skills{nice}.', fr: 'Correspondance faible : votre CV couvre {req} des {reqTotal} compétences requises{nice}.' },
  summaryNice: { en: ' and {n} of {t} nice-to-haves', fr: ' et {n} des {t} atouts' },
  summaryGaps: { en: ' Biggest gaps: {gaps}.', fr: ' Principaux manques : {gaps}.' },
  summaryNoGaps: { en: ' No required skill is missing.', fr: ' Aucune compétence requise ne manque.' },
  summaryEmpty: { en: 'No known skills were detected in the job ad. Try pasting the full ad, including the requirements section.', fr: 'Aucune compétence connue n’a été détectée dans l’annonce. Collez l’annonce complète, avec la section des exigences.' },

  noteYearsGap: { en: 'The ad asks for {min}+ years of experience; your CV shows about {cv}. Emphasise projects and impact to compensate.', fr: 'L’annonce demande {min} ans d’expérience ou plus ; votre CV en montre environ {cv}. Mettez en avant vos projets et leur impact.' },
  noteYearsOk: { en: 'The ad asks for {min}+ years of experience; your CV shows about {cv} — fine.', fr: 'L’annonce demande {min} ans d’expérience ou plus ; votre CV en montre environ {cv} — c’est bon.' },
  noteExtra: { en: 'Your CV also lists {skills}, which this ad does not mention — keep them, but lead with what the ad asks for.', fr: 'Votre CV mentionne aussi {skills}, que l’annonce ne cite pas — gardez-les, mais commencez par ce que l’annonce demande.' },
  noteOffline: { en: 'Offline demo mode: keyword-based analysis with templates. Connect a free LLM in Settings for rewritten bullets and a personalised letter.', fr: 'Mode démo hors ligne : analyse par mots-clés et modèles. Connectez un LLM gratuit dans les Réglages pour des suggestions réécrites et une lettre personnalisée.' },

  qGapWhy: { en: '{skill} is required and not on your CV — expect them to probe it.', fr: '{skill} est requis et absent de votre CV — attendez-vous à des questions dessus.' },
  qGap: { en: 'This role uses {skill}, which isn’t on your CV. How would you get up to speed in your first weeks?', fr: 'Ce poste utilise {skill}, qui n’apparaît pas dans votre CV. Comment vous mettriez-vous à niveau les premières semaines ?' },
  qGapTip: { en: 'Be honest that you haven’t used it professionally. Give a concrete plan (docs, a small project, pairing) and connect it to something similar you know{related}.', fr: 'Soyez honnête : vous ne l’avez pas utilisé en entreprise. Donnez un plan concret (doc, petit projet, binôme) et reliez-le à ce que vous connaissez déjà{related}.' },
  qRelated: { en: ' such as {skill}', fr: ', par exemple {skill}' },
  qSkillWhy: { en: '{skill} is a core requirement and appears in your CV.', fr: '{skill} est une exigence clé et figure dans votre CV.' },
  qSkillTip: { en: 'Anchor your answer in your CV: “{evidence}”. Use STAR (Situation, Task, Action, Result).', fr: 'Appuyez-vous sur votre CV : « {evidence} ». Utilisez la méthode STAR (Situation, Tâche, Action, Résultat).' },
  qFallback: { en: 'Walk me through something you built with {skill}. What would you do differently today?', fr: 'Présentez-moi un projet réalisé avec {skill}. Que feriez-vous différemment aujourd’hui ?' },
  qProject: { en: 'Tell me about “{project}”. What was the hardest technical decision and why?', fr: 'Parlez-moi de « {project} ». Quelle a été la décision technique la plus difficile, et pourquoi ?' },
  qProjectWhy: { en: 'Interviewers for junior roles love digging into personal projects.', fr: 'Pour un poste junior, les recruteurs aiment creuser les projets personnels.' },
  qProjectTip: { en: 'Explain the problem, 1–2 trade-offs you made, and what you learned. Have the repo or demo ready.', fr: 'Expliquez le problème, 1 ou 2 compromis faits, et ce que vous avez appris. Ayez le dépôt ou la démo sous la main.' },
  qMotivation: { en: 'Why do you want to join {company}, and why this role?', fr: 'Pourquoi voulez-vous rejoindre {company}, et pourquoi ce poste ?' },
  qMotivationWhy: { en: 'Asked in almost every first interview.', fr: 'Posée dans presque tous les premiers entretiens.' },
  qMotivationTip: { en: 'Link something specific from the ad (product, stack, mission) to your own experience. Avoid generic praise.', fr: 'Reliez un élément précis de l’annonce (produit, stack, mission) à votre expérience. Évitez les compliments génériques.' },
  qSoftWhy: { en: 'The ad explicitly mentions {skill}.', fr: 'L’annonce mentionne explicitement : {skill}.' },
  qSoftTip: { en: 'Pick a real situation, keep it under two minutes, and end with what you learned.', fr: 'Choisissez une situation réelle, restez sous deux minutes et terminez par ce que vous avez appris.' },
  yourCompany: { en: 'our company', fr: 'notre entreprise' },
} satisfies Record<string, Dict>;

export function t(key: keyof typeof T, lang: OutputLanguage, vars: Record<string, string | number> = {}): string {
  return T[key][lang].replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));
}

/** Weak openings → stronger verbs. Keys are normalized (lower-case, no accents). */
export const WEAK_OPENINGS: Array<[RegExp, string]> = [
  [/^(i )?worked on\s+/i, 'Developed '],
  [/^(i )?was responsible for\s+/i, 'Owned '],
  [/^responsible for\s+/i, 'Owned '],
  [/^(i )?helped (to )?(with )?/i, 'Contributed to '],
  [/^(i )?participated in\s+/i, 'Contributed to '],
  [/^(i )?was involved in\s+/i, 'Contributed to '],
  [/^(i )?did\s+/i, 'Delivered '],
  [/^(i )?made\s+/i, 'Built '],
  [/^(j'ai )?travaille sur\s+/i, 'Développé '],
  [/^(j'ai )?participe (a|au|aux)\s+/i, 'Contribué à '],
  [/^responsable (de|du|des)\s+/i, 'Piloté '],
  [/^(j'ai )?aide (a|au)\s+/i, 'Contribué à '],
];

/** Question bank for common skills; anything else uses the generic fallback. */
export const QUESTION_BANK: Record<string, Dict> = {
  react: { en: 'How do you decide between local state, context and a store in React? When does a component re-render?', fr: 'Comment choisissez-vous entre état local, contexte et store en React ? Quand un composant se re-rend-il ?' },
  typescript: { en: 'What is the difference between `unknown` and `any` in TypeScript, and when would you use a generic?', fr: 'Quelle est la différence entre `unknown` et `any` en TypeScript, et quand utiliser un générique ?' },
  javascript: { en: 'Explain the event loop: what happens between `setTimeout(fn, 0)` and a resolved Promise?', fr: 'Expliquez l’event loop : que se passe-t-il entre `setTimeout(fn, 0)` et une Promise résolue ?' },
  nodejs: { en: 'How would you structure error handling and validation in a Node.js REST API?', fr: 'Comment structureriez-vous la gestion d’erreurs et la validation dans une API REST Node.js ?' },
  express: { en: 'How do middlewares work in Express? Give an example you wrote.', fr: 'Comment fonctionnent les middlewares dans Express ? Donnez un exemple que vous avez écrit.' },
  rest: { en: 'Design the endpoints for a simple job-application resource. Which status codes would you return?', fr: 'Concevez les endpoints d’une ressource « candidature ». Quels codes HTTP renverriez-vous ?' },
  sql: { en: 'What is an index, and how would you find out why a query is slow?', fr: 'Qu’est-ce qu’un index, et comment trouveriez-vous pourquoi une requête est lente ?' },
  postgresql: { en: 'When would you choose PostgreSQL over MongoDB for a feature? Talk about constraints and transactions.', fr: 'Quand choisiriez-vous PostgreSQL plutôt que MongoDB ? Parlez de contraintes et de transactions.' },
  mongodb: { en: 'How do you model a one-to-many relationship in MongoDB: embed or reference?', fr: 'Comment modéliser une relation un-à-plusieurs dans MongoDB : imbriquer ou référencer ?' },
  docker: { en: 'What is the difference between an image and a container? How would you keep an image small?', fr: 'Quelle différence entre une image et un conteneur ? Comment garder une image légère ?' },
  git: { en: 'Walk me through your Git workflow on a team. How do you handle a merge conflict?', fr: 'Décrivez votre workflow Git en équipe. Comment gérez-vous un conflit de merge ?' },
  testing: { en: 'What do you unit-test versus integration-test? Show a test you are proud of.', fr: 'Que testez-vous en unitaire et en intégration ? Montrez un test dont vous êtes fier.' },
  cicd: { en: 'What would a minimal CI/CD pipeline for this team’s app look like?', fr: 'À quoi ressemblerait un pipeline CI/CD minimal pour l’application de l’équipe ?' },
  llm: { en: 'How do you get reliable, structured output from an LLM, and what do you do when it returns invalid data?', fr: 'Comment obtenir une sortie structurée fiable d’un LLM, et que faire quand il renvoie des données invalides ?' },
  'prompt-eng': { en: 'How do you reduce hallucinations in a prompt? Give a concrete technique you used.', fr: 'Comment réduire les hallucinations dans un prompt ? Donnez une technique concrète utilisée.' },
  'ai-agents': { en: 'What makes an AI agent different from a single LLM call, and how do you keep it safe?', fr: 'Qu’est-ce qui distingue un agent IA d’un simple appel LLM, et comment le sécuriser ?' },
  auth: { en: 'Where would you store a JWT in a web app, and what are the trade-offs?', fr: 'Où stocker un JWT dans une application web, et quels sont les compromis ?' },
  nextjs: { en: 'When would you use server components or static generation in Next.js?', fr: 'Quand utiliser les server components ou la génération statique dans Next.js ?' },
  python: { en: 'How do you structure a Python project and manage its dependencies?', fr: 'Comment structurez-vous un projet Python et gérez-vous ses dépendances ?' },
  a11y: { en: 'How do you make a custom dropdown accessible to keyboard and screen-reader users?', fr: 'Comment rendre un menu déroulant personnalisé accessible au clavier et aux lecteurs d’écran ?' },
  performance: { en: 'A page feels slow. How do you find and fix the problem?', fr: 'Une page est lente. Comment trouvez-vous et corrigez-vous le problème ?' },
};

export const SOFT_QUESTIONS: Record<string, Dict> = {
  teamwork: { en: 'Tell me about a disagreement in a code review. How was it resolved?', fr: 'Parlez-moi d’un désaccord lors d’une revue de code. Comment a-t-il été résolu ?' },
  communication: { en: 'Explain a technical project you did to someone non-technical.', fr: 'Expliquez un de vos projets techniques à une personne non technique.' },
  autonomy: { en: 'Describe a time you were blocked and had to find the answer on your own.', fr: 'Décrivez une situation où vous étiez bloqué et avez dû trouver la solution seul.' },
  'problem-solving': { en: 'What is the hardest bug you have fixed? How did you find it?', fr: 'Quel est le bug le plus difficile que vous ayez corrigé ? Comment l’avez-vous trouvé ?' },
  curiosity: { en: 'What is the last technology you learned on your own, and how did you learn it?', fr: 'Quelle est la dernière technologie apprise par vous-même, et comment ?' },
  ownership: { en: 'Tell me about something you shipped end-to-end. What happened after release?', fr: 'Parlez-moi d’une fonctionnalité livrée de bout en bout. Que s’est-il passé après la mise en production ?' },
};

export const COVER = {
  en: {
    greeting: (company: string | null) => `Dear ${company ? `${company} ` : ''}Hiring Team,`,
    opening: (title: string, company: string | null) =>
      `I am writing to apply for the ${title} position${company ? ` at ${company}` : ''}.`,
    stack: (skills: string, years: number | null) =>
      `${years && years >= 1 ? `Over roughly ${formatYears(years, 'en')} of hands-on work` : 'In my work and projects so far'}, I have used ${skills} — which matches much of what your team is looking for.`,
    evidenceIntro: 'A few points from my CV that are relevant to this role:',
    project: (p: string) => `I also built ${p}, which reflects how I like to work: shipping something real and learning along the way.`,
    gaps: (skills: string, plural: boolean) =>
      `I noticed the role also involves ${skills}. I have not used ${plural ? 'them' : 'it'} professionally yet, and I would be glad to ramp up quickly — I learn new tools best by building with them.`,
    soft: (skills: string, plural: boolean) =>
      `The ad also mentions ${skills}; ${plural ? 'these matter' : 'this matters'} to me as much as the technical side.`,
    closing: (company: string | null) =>
      `I would welcome the chance to discuss how I can contribute to ${company ?? 'your team'}. Thank you for your time and consideration.`,
    signoff: 'Kind regards,',
    position: 'advertised',
  },
  fr: {
    greeting: (company: string | null) => `Madame, Monsieur${company ? ` de l’équipe ${company}` : ''},`,
    opening: (title: string, company: string | null) =>
      `Je vous adresse ma candidature pour le poste de ${title}${company ? ` chez ${company}` : ''}.`,
    stack: (skills: string, years: number | null) =>
      `${years && years >= 1 ? `Au cours d’environ ${formatYears(years, 'fr')} d’expérience pratique` : 'Dans mon parcours et mes projets'}, j’ai utilisé ${skills}, ce qui correspond en grande partie à ce que recherche votre équipe.`,
    evidenceIntro: 'Quelques éléments de mon CV en lien avec ce poste :',
    project: (p: string) => `J’ai également réalisé ${p}, qui reflète ma façon de travailler : livrer un produit concret et apprendre en chemin.`,
    gaps: (skills: string, plural: boolean) =>
      `J’ai noté que le poste implique aussi ${skills}. Je ne ${plural ? 'les ai' : 'l’ai'} pas encore ${plural ? 'utilisés' : 'utilisé'} en entreprise, et je serais heureux de monter en compétence rapidement — j’apprends mieux en construisant.`,
    soft: (skills: string, plural: boolean) =>
      `L’annonce mentionne aussi ${skills} ; ${plural ? 'ces qualités comptent' : 'cette qualité compte'} autant pour moi que la technique.`,
    closing: (company: string | null) =>
      `Je serais ravi d’échanger sur la manière dont je peux contribuer à ${company ?? 'votre équipe'}. Je vous remercie de l’attention portée à ma candidature.`,
    signoff: 'Je vous prie d’agréer, Madame, Monsieur, mes salutations distinguées.',
    position: 'proposé',
  },
} as const;

export function formatYears(y: number, lang: OutputLanguage): string {
  const r = Math.round(y);
  const n = r < 1 ? 1 : r;
  if (lang === 'fr') return `${n} an${n > 1 ? 's' : ''}`;
  return `${n} year${n > 1 ? 's' : ''}`;
}

export function listJoin(items: string[], lang: OutputLanguage): string {
  if (items.length <= 1) return items[0] ?? '';
  const and = lang === 'fr' ? 'et' : 'and';
  return `${items.slice(0, -1).join(', ')} ${and} ${items[items.length - 1]}`;
}
