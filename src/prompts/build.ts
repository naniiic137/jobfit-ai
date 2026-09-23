import type { OutputLanguage } from '../types';
import { FEW_SHOT_ANSWER, FEW_SHOT_CV, FEW_SHOT_JOB } from './fewshot';
import { systemPrompt } from './system';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface PromptBundle {
  system: string;
  messages: ChatMessage[];
}

/** Keep requests inside free-tier context limits; long CVs are rarely > 12k chars. */
export const MAX_INPUT_CHARS = 12_000;

export function clip(text: string, max = MAX_INPUT_CHARS): string {
  const t = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return t.length <= max ? t : `${t.slice(0, max)}\n[…truncated]`;
}

/**
 * Wrap untrusted text in tags. Closing tags inside the text are neutralised so
 * a CV cannot "break out" of its block (a basic prompt-injection guard).
 */
export function fence(tag: 'cv' | 'job_ad', text: string): string {
  const safe = clip(text).replace(/<\/?\s*(cv|job_ad)\s*>/gi, '[$1]');
  return `<${tag}>\n${safe}\n</${tag}>`;
}

export interface PreScan {
  matched: string[];
  missing: string[];
}

export function userMessage(cv: string, job: string, lang: OutputLanguage, preScan?: PreScan): string {
  const parts = [fence('cv', cv), fence('job_ad', job)];
  if (preScan && (preScan.matched.length || preScan.missing.length)) {
    parts.push(
      `Keyword pre-scan (deterministic, may be incomplete or wrong — verify against the texts):\n` +
        `- found in both: ${preScan.matched.join(', ') || 'none'}\n` +
        `- in the ad but not found in the CV: ${preScan.missing.join(', ') || 'none'}`,
    );
  }
  parts.push(`Output language: ${lang === 'fr' ? 'French' : 'English'}. Return the JSON object now.`);
  return parts.join('\n\n');
}

/** System prompt + one few-shot exchange + the real request. */
export function buildAnalysisPrompt(cv: string, job: string, lang: OutputLanguage, preScan?: PreScan): PromptBundle {
  return {
    system: systemPrompt(lang),
    messages: [
      { role: 'user', content: userMessage(FEW_SHOT_CV, FEW_SHOT_JOB, 'en') },
      { role: 'assistant', content: JSON.stringify(FEW_SHOT_ANSWER) },
      { role: 'user', content: userMessage(cv, job, lang, preScan) },
    ],
  };
}

/**
 * Second (and last) attempt after invalid output: show the model its own
 * answer and the exact validation errors, and ask for a corrected object.
 */
export function buildRepairPrompt(original: PromptBundle, badOutput: string, errors: string[]): PromptBundle {
  const shownErrors = errors.slice(0, 12).map((e) => `- ${e}`).join('\n');
  return {
    system: original.system,
    messages: [
      ...original.messages,
      { role: 'assistant', content: badOutput.slice(0, 8_000) },
      {
        role: 'user',
        content:
          `Your previous answer was not valid for the required JSON schema:\n${shownErrors}\n\n` +
          'Return the complete corrected JSON object only. Keep every grounding rule: do not add facts that are not in the CV.',
      },
    ],
  };
}
