import type { ScoreBand } from './analyzer/score';
import type { SkillCategory } from './schemas/categories';
import type { OutputLanguage, ProviderId } from './types';

/**
 * Labels of the results view, in both output languages. The generated text
 * (summary, bullets, letter…) is already written in the chosen language; these
 * are the labels around it, so a French analysis reads French from top to bottom.
 * Every language must fill every key: TypeScript checks it.
 */
export interface ResultStrings {
  eyebrow: string;
  untitledJob: string;
  provider: Record<ProviderId, string>;
  band: Record<ScoreBand, string>;
  gaugeLabel: (score: number, band: string) => string;
  required: string;
  niceToHave: string;
  missing: string;
  coverageOffline: (n: number) => string;
  coverageLlm: (n: number) => string;
  lowCoverageOffline: string;
  lowCoverageLlm: string;
  scoredBy: string;
  /** Shown on devices with a mouse. */
  proofHintPointer: string;
  /** Shown on touch screens, where there is no hover. */
  proofHintTouch: string;
  proofFromCv: (quote: string) => string;
  proofNoQuote: string;
  proofClaimed: (quote: string) => string;
  proofClaimedNoQuote: string;
  coverageByCategory: string;
  category: Record<SkillCategory, string>;
  matched: string;
  matchedList: string;
  noOverlap: string;
  claimedTitle: string;
  claimedHelp: string;
  claimedList: string;
  claimedTag: string;
  missingList: string;
  nothingMissing: string;
  tagRequired: string;
  tagNice: string;
  suggestions: string;
  tabBullets: string;
  tabLetter: string;
  tabInterview: string;
  noBullets: string;
  before: string;
  after: string;
  gap: string;
  words: (n: number) => string;
  languageName: string;
  copy: string;
  copied: string;
  letterAria: string;
  letterDraftNote: string;
  whyTheyAsk: string;
  tip: string;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

const EN: ResultStrings = {
  eyebrow: 'Analysis',
  untitledJob: 'Job match',
  provider: { offline: 'Offline demo', gemini: 'Gemini', ollama: 'Ollama', openai: 'OpenAI-compatible' },
  band: { strong: 'Strong match', good: 'Good match', partial: 'Partial match', weak: 'Weak match' },
  gaugeLabel: (score, band) => `Match score ${score} out of 100: ${band}`,
  required: 'Required',
  niceToHave: 'Nice to have',
  missing: 'Missing',
  coverageOffline: (n) => `Recognised ${n} ${plural(n, 'skill', 'skills')} in this ad; others aren't scored.`,
  coverageLlm: (n) => `The model listed ${n} ${plural(n, 'skill', 'skills')} from this ad.`,
  lowCoverageOffline:
    ' That is too few for a reliable score: the offline list only knows common software skills. Try an LLM provider for this ad.',
  lowCoverageLlm: ' That is too few for a reliable score.',
  scoredBy: 'Scored by the app, not the model: required skills weigh 3×, nice-to-haves 1×, soft skills half.',
  proofHintPointer: 'Hover or click a green chip to see the CV line that proves it.',
  proofHintTouch: 'Tap a green chip to see the CV line that proves it.',
  proofFromCv: (q) => `From your CV: “${q}”`,
  proofNoQuote: 'Found in your CV (no single line to quote).',
  proofClaimed: (q) => `The model quoted: “${q}” (not found in your CV)`,
  proofClaimedNoQuote: 'The model gave no quote from your CV.',
  coverageByCategory: 'Coverage by category',
  category: {
    language: 'Languages',
    frontend: 'Frontend',
    backend: 'Backend',
    database: 'Data',
    devops: 'DevOps',
    ai: 'AI & ML',
    tool: 'Tools',
    practice: 'Practices',
    soft: 'Soft skills',
    other: 'Other',
  },
  matched: 'Matched',
  matchedList: 'Matched skills',
  noOverlap: 'No overlap found yet.',
  claimedTitle: 'Claimed by the model, not found in your CV',
  claimedHelp: 'Its quote is not in your CV text, so these earn no points. Add them to your CV only if they are true.',
  claimedList: 'Claimed by the model but not found in your CV',
  claimedTag: 'claimed, not found in CV',
  missingList: 'Missing skills',
  nothingMissing: 'Nothing missing. Nice.',
  tagRequired: 'required',
  tagNice: 'nice',
  suggestions: 'Suggestions',
  tabBullets: 'Tailored bullets',
  tabLetter: 'Cover letter',
  tabInterview: 'Interview prep',
  noBullets: 'No bullet suggestions for this CV.',
  before: 'Before',
  after: 'After',
  gap: 'Gap',
  words: (n) => `${n} ${plural(n, 'word', 'words')}`,
  languageName: 'English',
  copy: 'Copy',
  copied: 'Copied',
  letterAria: 'Cover letter draft',
  letterDraftNote: 'Draft only: read it, make it yours, and check every claim before sending.',
  whyTheyAsk: 'Why they ask:',
  tip: 'Tip:',
};

const FR: ResultStrings = {
  eyebrow: 'Analyse',
  untitledJob: 'Correspondance au poste',
  provider: { offline: 'Démo hors ligne', gemini: 'Gemini', ollama: 'Ollama', openai: 'Compatible OpenAI' },
  band: { strong: 'Très bonne correspondance', good: 'Bonne correspondance', partial: 'Correspondance partielle', weak: 'Correspondance faible' },
  gaugeLabel: (score, band) => `Score de correspondance ${score} sur 100 : ${band}`,
  required: 'Requises',
  niceToHave: 'Atouts',
  missing: 'Manquantes',
  coverageOffline: (n) =>
    `${n} ${plural(n, 'compétence reconnue', 'compétences reconnues')} dans cette annonce ; les autres ne sont pas notées.`,
  coverageLlm: (n) => `Le modèle a relevé ${n} ${plural(n, 'compétence', 'compétences')} dans cette annonce.`,
  lowCoverageOffline:
    ' C’est trop peu pour un score fiable : la liste hors ligne ne connaît que les compétences logicielles courantes. Essayez un fournisseur LLM pour cette annonce.',
  lowCoverageLlm: ' C’est trop peu pour un score fiable.',
  scoredBy: 'Score calculé par l’application, pas par le modèle : compétences requises ×3, atouts ×1, savoir-être ×0,5.',
  proofHintPointer: 'Survolez ou cliquez une pastille verte pour voir la ligne du CV qui la prouve.',
  proofHintTouch: 'Touchez une pastille verte pour voir la ligne du CV qui la prouve.',
  proofFromCv: (q) => `Dans votre CV : « ${q} »`,
  proofNoQuote: 'Présente dans votre CV (pas de ligne unique à citer).',
  proofClaimed: (q) => `Le modèle a cité : « ${q} » (introuvable dans votre CV)`,
  proofClaimedNoQuote: 'Le modèle n’a cité aucune ligne de votre CV.',
  coverageByCategory: 'Couverture par catégorie',
  category: {
    language: 'Langages',
    frontend: 'Front-end',
    backend: 'Back-end',
    database: 'Données',
    devops: 'DevOps',
    ai: 'IA & ML',
    tool: 'Outils',
    practice: 'Pratiques',
    soft: 'Savoir-être',
    other: 'Autres',
  },
  matched: 'Présentes',
  matchedList: 'Compétences présentes',
  noOverlap: 'Aucun point commun trouvé pour l’instant.',
  claimedTitle: 'Annoncées par le modèle, introuvables dans votre CV',
  claimedHelp:
    'Sa citation ne figure pas dans votre CV : elles ne rapportent aucun point. Ajoutez-les à votre CV seulement si elles sont vraies.',
  claimedList: 'Annoncées par le modèle mais introuvables dans votre CV',
  claimedTag: 'annoncée, absente du CV',
  missingList: 'Compétences manquantes',
  nothingMissing: 'Rien ne manque. Bravo.',
  tagRequired: 'requise',
  tagNice: 'atout',
  suggestions: 'Suggestions',
  tabBullets: 'Puces adaptées',
  tabLetter: 'Lettre de motivation',
  tabInterview: 'Préparer l’entretien',
  noBullets: 'Aucune suggestion de puce pour ce CV.',
  before: 'Avant',
  after: 'Après',
  gap: 'Manque',
  words: (n) => `${n} ${plural(n, 'mot', 'mots')}`,
  languageName: 'Français',
  copy: 'Copier',
  copied: 'Copié',
  letterAria: 'Brouillon de lettre de motivation',
  letterDraftNote: 'Simple brouillon : relisez-le, personnalisez-le et vérifiez chaque affirmation avant l’envoi.',
  whyTheyAsk: 'Pourquoi cette question :',
  tip: 'Conseil :',
};

export const RESULT_STRINGS: Record<OutputLanguage, ResultStrings> = { en: EN, fr: FR };

export function resultStrings(lang: OutputLanguage): ResultStrings {
  return RESULT_STRINGS[lang] ?? EN;
}
