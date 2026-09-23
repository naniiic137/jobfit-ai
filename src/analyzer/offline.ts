import type { AnalysisPayload, BulletSuggestion, Importance, InterviewQuestion, SkillAssessment } from '../schemas/analysis';
import type { OutputLanguage } from '../types';
import { bestEvidenceIndex, cvSkillMap, extractSkills, lineAt, normalize, snippetAt, type ExtractedSkill } from './extract';
import { cvFacts, jobFacts, type CvFacts, type JobFacts } from './facts';
import { computeScore, scoreBand, skillWeight } from './score';
import { detectSections, importanceFor, sectionAt } from './sections';
import type { SkillCategory } from '../schemas/analysis';
import { COVER, QUESTION_BANK, SOFT_QUESTIONS, WEAK_OPENINGS, formatYears, listJoin, t } from './templates';

/** Categories made of named technologies (as opposed to practices and soft skills). */
export const NAMED_TECH: ReadonlySet<SkillCategory> = new Set(['language', 'frontend', 'backend', 'database', 'devops', 'ai', 'tool']);

/** Spoken languages live in the "soft" category but are not personality traits. */
const SPOKEN_LANGUAGES = new Set(['english', 'french', 'arabic']);

export interface JobSkill {
  id: string;
  label: string;
  category: SkillAssessment['category'];
  importance: Importance;
  /** How the ad spells it (e.g. "ReactJS"), used to mirror wording in bullets. */
  jobSurface: string;
}

/** Skills requested by the ad, with importance from the section they appear in. */
export function jobSkills(job: string): JobSkill[] {
  const sections = detectSections(job);
  const out: JobSkill[] = [];
  for (const ex of extractSkills(job)) {
    let importance: Importance | null = null;
    let surface = ex.hits[0]!.surface;
    for (const hit of ex.hits) {
      const imp = importanceFor(sectionAt(sections, hit.index).kind, lineAt(job, hit.index));
      if (imp === 'required') {
        importance = 'required';
        surface = hit.surface;
        break;
      }
      if (imp === 'nice' && importance === null) {
        importance = 'nice';
        surface = hit.surface;
      }
    }
    // Prefer the canonical spelling when the ad uses it anywhere ("React" over "react hooks").
    const canonical = ex.hits.find((h) => normalize(h.surface) === normalize(ex.def.label));
    if (canonical) surface = canonical.surface;
    // For practices and soft skills the label reads better than a matched alias ("sprints").
    if (!NAMED_TECH.has(ex.def.category)) surface = ex.def.label;
    if (importance) out.push({ id: ex.def.id, label: ex.def.label, category: ex.def.category, importance, jobSurface: surface });
  }
  return out;
}

export interface OfflineContext {
  cv: string;
  job: string;
  lang: OutputLanguage;
  jobSkills: JobSkill[];
  cvSkills: Map<string, ExtractedSkill>;
  cvFacts: CvFacts;
  jobFacts: JobFacts;
}

export { cvSkillMap };

export function buildContext(cv: string, job: string, lang: OutputLanguage, now = new Date()): OfflineContext {
  return {
    cv,
    job,
    lang,
    jobSkills: jobSkills(job),
    cvSkills: cvSkillMap(cv),
    cvFacts: cvFacts(cv, now),
    jobFacts: jobFacts(job),
  };
}

/**
 * Deterministic, dependency-free analysis. Everything it says about the CV is
 * either a direct quote or a clearly-marked placeholder, so it can never
 * invent experience.
 */
export function analyzeOffline(cv: string, job: string, lang: OutputLanguage, now = new Date()): AnalysisPayload {
  const ctx = buildContext(cv, job, lang, now);

  const skills: SkillAssessment[] = ctx.jobSkills.map((js) => {
    const inCv = ctx.cvSkills.get(js.id);
    return {
      name: js.label,
      category: js.category,
      importance: js.importance,
      inCv: Boolean(inCv),
      evidence: inCv ? snippetAt(cv, bestEvidenceIndex(cv, inCv.hits)) : null,
    };
  });

  return {
    jobTitle: ctx.jobFacts.title,
    company: ctx.jobFacts.company,
    summary: buildSummary(skills, lang),
    skills,
    notes: buildNotes(ctx),
    bulletSuggestions: buildBulletSuggestions(ctx),
    coverLetter: buildCoverLetter(ctx),
    interviewQuestions: buildQuestions(ctx),
  };
}

// ── Summary & notes ─────────────────────────────────────────────────────────

function missingByWeight(skills: SkillAssessment[]): SkillAssessment[] {
  return skills.filter((s) => !s.inCv).sort((a, b) => skillWeight(b) - skillWeight(a));
}

export function buildSummary(skills: SkillAssessment[], lang: OutputLanguage): string {
  if (!skills.length) return t('summaryEmpty', lang);
  const d = computeScore(skills);
  const nice = d.niceTotal ? t('summaryNice', lang, { n: d.niceMatched, t: d.niceTotal }) : '';
  const head = t(`summary_${scoreBand(d.score)}`, lang, { req: d.requiredMatched, reqTotal: d.requiredTotal, nice });
  const gaps = missingByWeight(skills).filter((s) => s.importance === 'required' && s.category !== 'soft').slice(0, 3).map((s) => s.name);
  return head + (gaps.length ? t('summaryGaps', lang, { gaps: listJoin(gaps, lang) }) : t('summaryNoGaps', lang));
}

function buildNotes(ctx: OfflineContext): string[] {
  const notes: string[] = [];
  const { minYears } = ctx.jobFacts;
  const cvYears = ctx.cvFacts.years;
  if (minYears !== null && cvYears !== null) {
    notes.push(t(cvYears + 0.25 < minYears ? 'noteYearsGap' : 'noteYearsOk', ctx.lang, { min: minYears, cv: formatYears(cvYears, ctx.lang) }));
  }
  const asked = new Set(ctx.jobSkills.map((s) => s.id));
  const extra = [...ctx.cvSkills.values()].filter((s) => !asked.has(s.def.id) && s.def.category !== 'soft').map((s) => s.def.label).slice(0, 4);
  if (extra.length) notes.push(t('noteExtra', ctx.lang, { skills: listJoin(extra, ctx.lang) }));
  notes.push(t('noteOffline', ctx.lang));
  return notes;
}

// ── Bullet suggestions ─────────────────────────────────────────────────────

export function improveBullet(bullet: string, ctx: OfflineContext): BulletSuggestion | null {
  const reasons: string[] = [];
  let text = bullet;

  // 1. Stronger opening verb.
  const norm = normalize(text);
  for (const [re, verb] of WEAK_OPENINGS) {
    const m = norm.match(re);
    if (m) {
      text = verb + text.slice(m[0].length);
      reasons.push(t('weakVerb', ctx.lang));
      break;
    }
  }

  // 2. Mirror the job ad's spelling of skills mentioned in this bullet.
  const mirrored: string[] = [];
  for (const ex of extractSkills(text)) {
    const js = ctx.jobSkills.find((j) => j.id === ex.def.id);
    // Only swap names of technologies ("ReactJS" → "React"); rewording practices changes meaning.
    if (!js || !NAMED_TECH.has(js.category)) continue;
    for (const hit of ex.hits) {
      const a = normalize(hit.surface);
      const b = normalize(js.jobSurface);
      // Skip pure plural/singular differences ("REST API" vs "REST APIs").
      const sameWord = a === b || `${a}s` === b || `${b}s` === a;
      if (!sameWord && js.jobSurface.length > 1 && !mirrored.includes(js.jobSurface)) {
        text = text.replace(hit.surface, js.jobSurface);
        mirrored.push(js.jobSurface);
        break;
      }
    }
  }
  if (mirrored.length) reasons.push(t('mirror', ctx.lang, { terms: mirrored.join(', ') }));

  // 3. Ask for a real metric (placeholder, never an invented number).
  if (!/\d/.test(text)) {
    text = text.replace(/[.;]\s*$/, '') + t('quantifyPlaceholder', ctx.lang);
    reasons.push(t('quantify', ctx.lang));
  }

  if (!reasons.length || text === bullet) return null;
  return { original: bullet, suggestion: text, reason: reasons.join(' ') };
}

function buildBulletSuggestions(ctx: OfflineContext): BulletSuggestion[] {
  const weightById = new Map(ctx.jobSkills.map((j) => [j.id, skillWeight(j)]));
  const ranked = ctx.cvFacts.bullets
    .map((b) => ({ b, w: extractSkills(b).reduce((sum, ex) => sum + (weightById.get(ex.def.id) ?? 0), 0) }))
    .filter((x) => x.w > 0)
    .sort((a, b) => b.w - a.w);

  const out: BulletSuggestion[] = [];
  for (const { b } of ranked) {
    const s = improveBullet(b, ctx);
    if (s) out.push(s);
    if (out.length >= 4) break;
  }

  const missing = ctx.jobSkills.filter((j) => !ctx.cvSkills.has(j.id) && j.category !== 'soft');
  const gaps = [...missing.filter((m) => m.importance === 'required'), ...missing.filter((m) => m.importance === 'nice')].slice(0, 3);
  for (const g of gaps) {
    out.push({
      original: null,
      suggestion: t('gapSuggestion', ctx.lang, { skill: g.jobSurface }),
      reason: t(g.importance === 'required' ? 'gapReason' : 'niceGapReason', ctx.lang, { skill: g.label }),
    });
  }
  return out;
}

// ── Cover letter ───────────────────────────────────────────────────────────

/** A CV bullet with a stronger verb and the ad's wording, but no placeholder (it goes in a letter). */
function polish(bullet: string, ctx: OfflineContext): string {
  const improved = improveBullet(bullet, ctx)?.suggestion ?? bullet;
  return improved.replace(t('quantifyPlaceholder', ctx.lang), '');
}

function projectName(line: string): string {
  const name = line.split(/\s+[—–-]\s+|:\s|\s\(/)[0]!.trim();
  return name.length > 60 ? `${name.slice(0, 57)}…` : name;
}

export function buildCoverLetter(ctx: OfflineContext): string {
  const c = COVER[ctx.lang];
  const { title, company } = ctx.jobFacts;
  const matched = ctx.jobSkills.filter((j) => ctx.cvSkills.has(j.id));
  const tech = matched.filter((j) => NAMED_TECH.has(j.category)).sort((a, b) => skillWeight(b) - skillWeight(a));
  const soft = matched.filter((j) => j.category === 'soft' && !SPOKEN_LANGUAGES.has(j.id)).map((j) => j.label.toLowerCase());
  const missingReq = ctx.jobSkills.filter((j) => j.importance === 'required' && NAMED_TECH.has(j.category) && !ctx.cvSkills.has(j.id));

  const paragraphs: string[] = [];
  paragraphs.push(c.opening(title ?? c.position, company));
  if (tech.length) paragraphs.push(c.stack(listJoin(tech.slice(0, 5).map((j) => j.jobSurface), ctx.lang), ctx.cvFacts.years));

  // Quote the CV's own bullets that prove the most important matched skills.
  const techIds = new Set(tech.map((j) => j.id));
  const evidence = ctx.cvFacts.bullets
    .map((b) => ({ b, n: extractSkills(b).filter((e) => techIds.has(e.def.id)).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 3)
    .map((x) => `• ${polish(x.b, ctx).replace(/[.;]\s*$/, '')}.`);
  if (evidence.length) paragraphs.push(`${c.evidenceIntro}\n${evidence.join('\n')}`);

  const project = ctx.cvFacts.projects[0];
  if (project) paragraphs.push(c.project(projectName(project)));
  if (missingReq.length) paragraphs.push(c.gaps(listJoin(missingReq.slice(0, 2).map((j) => j.jobSurface), ctx.lang), missingReq.length > 1));
  if (soft.length) paragraphs.push(c.soft(listJoin(soft.slice(0, 3), ctx.lang), soft.length > 1));
  paragraphs.push(c.closing(company));

  const name = ctx.cvFacts.name ?? (ctx.lang === 'fr' ? '[Votre nom]' : '[Your name]');
  return `${c.greeting(company)}\n\n${paragraphs.join('\n\n')}\n\n${c.signoff}\n${name}`;
}

// ── Interview questions ────────────────────────────────────────────────────

export function buildQuestions(ctx: OfflineContext): InterviewQuestion[] {
  const { lang } = ctx;
  const qs: InterviewQuestion[] = [];
  const byWeight = [...ctx.jobSkills].sort((a, b) => skillWeight(b) - skillWeight(a));
  const askable = (j: JobSkill) => NAMED_TECH.has(j.category) || Boolean(QUESTION_BANK[j.id]);
  const matchedTech = byWeight.filter((j) => askable(j) && ctx.cvSkills.has(j.id));
  const missingTech = byWeight.filter((j) => askable(j) && j.importance === 'required' && !ctx.cvSkills.has(j.id));

  for (const j of matchedTech.slice(0, 3)) {
    const hits = ctx.cvSkills.get(j.id)!.hits;
    qs.push({
      question: QUESTION_BANK[j.id]?.[lang] ?? t('qFallback', lang, { skill: j.label }),
      why: t('qSkillWhy', lang, { skill: j.label }),
      tip: t('qSkillTip', lang, { evidence: snippetAt(ctx.cv, bestEvidenceIndex(ctx.cv, hits), 90) }),
    });
  }

  for (const j of missingTech.slice(0, 2)) {
    const related = matchedTech.find((m) => m.category === j.category && m.id !== j.id);
    qs.push({
      question: t('qGap', lang, { skill: j.label }),
      why: t('qGapWhy', lang, { skill: j.label }),
      tip: t('qGapTip', lang, { related: related ? t('qRelated', lang, { skill: related.label }) : '' }),
    });
  }

  const project = ctx.cvFacts.projects[0];
  if (project) {
    qs.push({ question: t('qProject', lang, { project: projectName(project) }), why: t('qProjectWhy', lang), tip: t('qProjectTip', lang) });
  }

  for (const j of byWeight.filter((s) => s.category === 'soft' && SOFT_QUESTIONS[s.id]).slice(0, 2)) {
    qs.push({ question: SOFT_QUESTIONS[j.id]![lang], why: t('qSoftWhy', lang, { skill: j.label }), tip: t('qSoftTip', lang) });
  }

  qs.push({
    question: t('qMotivation', lang, { company: ctx.jobFacts.company ?? t('yourCompany', lang) }),
    why: t('qMotivationWhy', lang),
    tip: t('qMotivationTip', lang),
  });
  return qs.slice(0, 10);
}
