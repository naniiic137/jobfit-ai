import type { AnalysisPayload, SkillAssessment, SkillCategory } from './schemas/analysis';

export type OutputLanguage = 'en' | 'fr';

export type ProviderId = 'offline' | 'gemini' | 'ollama' | 'openai';

export interface VerifiedSkill extends SkillAssessment {
  /**
   * false when an LLM claimed the skill is in the CV but its evidence quote
   * could not be found in the CV text (possible hallucination).
   */
  verified: boolean;
}

export interface CategoryBreakdown {
  category: SkillCategory;
  matched: number;
  total: number;
}

export interface ScoreDetails {
  score: number;
  requiredMatched: number;
  requiredTotal: number;
  niceMatched: number;
  niceTotal: number;
}

export interface AnalysisResult extends Omit<AnalysisPayload, 'skills'> {
  id: string;
  createdAt: string;
  language: OutputLanguage;
  provider: ProviderId;
  model: string | null;
  skills: VerifiedSkill[];
  scoreDetails: ScoreDetails;
  breakdown: CategoryBreakdown[];
}
