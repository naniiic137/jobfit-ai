import type { AnalysisPayload } from '../schemas/analysis';
import type { AnalysisResult, OutputLanguage, ProviderId, VerifiedSkill } from '../types';
import { extractSkills, normalize } from './extract';
import { computeBreakdown, computeScore } from './score';

function squash(s: string): string {
  return normalize(s).replace(/[“”"«»'`*]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Grounding check: does the evidence quote really come from the CV?
 * The quote may be shortened with "…", so every fragment of 8+ chars must be found.
 */
export function evidenceInCv(evidence: string, cv: string): boolean {
  const hay = squash(cv);
  const fragments = evidence.split(/…|\.\.\./).map(squash).filter((f) => f.length >= 8);
  return fragments.length > 0 && fragments.every((f) => hay.includes(f));
}

export function verifySkills(skills: AnalysisPayload['skills'], cv: string): VerifiedSkill[] {
  const cvIds = new Set(extractSkills(cv).map((s) => s.def.id));
  return skills.map((s) => {
    if (!s.inCv) return { ...s, verified: true };
    const byQuote = s.evidence ? evidenceInCv(s.evidence, cv) : false;
    const byTaxonomy = extractSkills(s.name).some((e) => cvIds.has(e.def.id));
    return { ...s, verified: byQuote || byTaxonomy };
  });
}

/** Merge duplicates the LLM may return ("React" twice), keeping the strongest label. */
export function dedupeSkills(skills: AnalysisPayload['skills']): AnalysisPayload['skills'] {
  const map = new Map<string, AnalysisPayload['skills'][number]>();
  for (const s of skills) {
    const key = squash(s.name);
    const prev = map.get(key);
    if (!prev) {
      map.set(key, s);
      continue;
    }
    map.set(key, {
      ...prev,
      importance: prev.importance === 'required' || s.importance === 'required' ? 'required' : 'nice',
      inCv: prev.inCv || s.inCv,
      evidence: prev.evidence ?? s.evidence,
    });
  }
  return [...map.values()];
}

export interface FinalizeMeta {
  cv: string;
  language: OutputLanguage;
  provider: ProviderId;
  model: string | null;
  now?: Date;
}

export function finalize(payload: AnalysisPayload, meta: FinalizeMeta): AnalysisResult {
  const skills = verifySkills(dedupeSkills(payload.skills), meta.cv);
  // Unverified "matches" do not earn points: we cannot confirm them from the CV.
  const scored = skills.map((s) => ({ ...s, inCv: s.inCv && s.verified }));
  const now = meta.now ?? new Date();
  return {
    ...payload,
    skills,
    id: `${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now.toISOString(),
    language: meta.language,
    provider: meta.provider,
    model: meta.model,
    scoreDetails: computeScore(scored),
    breakdown: computeBreakdown(scored),
  };
}
