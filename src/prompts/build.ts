import type { OutputLanguage } from '../types';
import { fewShotFor } from './fewshot';
import { clip } from './limits';
import { systemPrompt } from './system';

export { MAX_INPUT_CHARS, clip, truncatedInputs } from './limits';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface PromptBundle {
  system: string;
  messages: ChatMessage[];
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

/** System prompt + one few-shot exchange (in the output language) + the real request. */
export function buildAnalysisPrompt(cv: string, job: string, lang: OutputLanguage, preScan?: PreScan): PromptBundle {
  const example = fewShotFor(lang);
  return {
    system: systemPrompt(lang),
    messages: [
      { role: 'user', content: userMessage(example.cv, example.job, lang) },
      { role: 'assistant', content: JSON.stringify(example.answer) },
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
