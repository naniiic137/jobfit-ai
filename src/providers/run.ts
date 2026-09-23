import { analyzeOffline, buildContext } from '../analyzer/offline';
import { finalize } from '../analyzer/finalize';
import { buildAnalysisPrompt, buildRepairPrompt, type PreScan } from '../prompts/build';
import { truncatedInputs, truncationMessage } from '../prompts/limits';
import { PROMPT_VERSION } from '../prompts/system';
import { AnalysisPayloadSchema, analysisJsonSchema, type AnalysisPayload } from '../schemas/analysis';
import type { AnalysisResult, OutputLanguage } from '../types';
import { geminiClient } from './gemini';
import { ollamaClient } from './ollama';
import { openAiCompatClient } from './openaiCompat';
import { ProviderError, type LlmClient, type ProviderSettings } from './types';

/**
 * Pull a JSON object out of a model reply. Handles the usual failure modes:
 * markdown fences, a sentence before/after the object, BOM.
 */
export function extractJson(raw: string): unknown {
  const text = raw.replace(/^﻿/, '').trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1]!.trim() : text;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start !== -1 && end > start) return JSON.parse(candidate.slice(start, end + 1));
    throw new SyntaxError('No JSON object found in the model output.');
  }
}

export type ValidationResult = { ok: true; data: AnalysisPayload } | { ok: false; errors: string[] };

export function validatePayload(raw: string): ValidationResult {
  let json: unknown;
  try {
    json = extractJson(raw);
  } catch (e) {
    return { ok: false, errors: [`Invalid JSON: ${(e as Error).message}`] };
  }
  const parsed = AnalysisPayloadSchema.safeParse(json);
  if (parsed.success) return { ok: true, data: parsed.data };
  return {
    ok: false,
    errors: parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
  };
}

export interface LlmRunInfo {
  attempts: number;
  repaired: boolean;
}

/**
 * Ask the model, validate with zod, and if the output is invalid, send ONE
 * repair request containing the validation errors. Fails loudly after that
 * rather than showing the user half-broken data.
 */
export async function completeWithRepair(
  client: LlmClient,
  cv: string,
  job: string,
  lang: OutputLanguage,
  opts: { preScan?: PreScan; signal?: AbortSignal } = {},
): Promise<{ payload: AnalysisPayload; info: LlmRunInfo }> {
  const prompt = buildAnalysisPrompt(cv, job, lang, opts.preScan);
  const jsonSchema = analysisJsonSchema();
  const first = await client.complete({ prompt, jsonSchema, signal: opts.signal });
  const v1 = validatePayload(first);
  if (v1.ok) return { payload: v1.data, info: { attempts: 1, repaired: false } };

  const second = await client.complete({ prompt: buildRepairPrompt(prompt, first, v1.errors), jsonSchema, signal: opts.signal });
  const v2 = validatePayload(second);
  if (v2.ok) return { payload: v2.data, info: { attempts: 2, repaired: true } };

  throw new ProviderError(
    `The model returned invalid data twice. First errors: ${v2.errors.slice(0, 3).join('; ')}`,
    undefined,
    'Try again, pick a larger model, or switch to offline mode.',
  );
}

export function clientFor(settings: ProviderSettings): LlmClient | null {
  switch (settings.provider) {
    case 'gemini':
      return geminiClient(settings.gemini.apiKey.trim(), settings.gemini.model.trim());
    case 'ollama':
      return ollamaClient(settings.ollama.baseUrl.trim(), settings.ollama.model.trim());
    case 'openai':
      return openAiCompatClient(settings.openai.baseUrl.trim(), settings.openai.apiKey.trim(), settings.openai.model.trim());
    default:
      return null;
  }
}

/** Deterministic keyword scan, handed to the LLM as a (non-authoritative) hint. */
export function preScan(cv: string, job: string): PreScan {
  const ctx = buildContext(cv, job, 'en');
  return {
    matched: ctx.jobSkills.filter((s) => ctx.cvSkills.has(s.id)).map((s) => s.label),
    missing: ctx.jobSkills.filter((s) => !ctx.cvSkills.has(s.id)).map((s) => s.label),
  };
}

export async function runAnalysis(
  settings: ProviderSettings,
  cv: string,
  job: string,
  lang: OutputLanguage,
  signal?: AbortSignal,
): Promise<{ result: AnalysisResult; info: LlmRunInfo | null }> {
  const client = clientFor(settings);
  if (!client) {
    const payload = analyzeOffline(cv, job, lang);
    return { result: finalize(payload, { cv, language: lang, provider: 'offline', model: null }), info: null };
  }
  const { payload, info } = await completeWithRepair(client, cv, job, lang, { preScan: preScan(cv, job), signal });
  const extraNotes = truncatedInputs(cv, job).map((t) => truncationMessage(t));
  return {
    result: finalize(payload, { cv, language: lang, provider: client.id, model: client.model, promptVersion: PROMPT_VERSION, extraNotes }),
    info,
  };
}
