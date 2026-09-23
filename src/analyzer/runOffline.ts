import type { AnalysisResult, OutputLanguage } from '../types';
import { finalize } from './finalize';
import { analyzeOffline } from './offline';

/**
 * The whole offline path in one call. It needs no network and no zod, so the
 * app can run it without loading the LLM providers and the schema validator
 * (those are imported on demand when an LLM provider is selected).
 */
export function runOffline(cv: string, job: string, lang: OutputLanguage, now = new Date()): AnalysisResult {
  return finalize(analyzeOffline(cv, job, lang, now), { cv, language: lang, provider: 'offline', model: null, now });
}
