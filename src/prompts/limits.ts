/**
 * Input limits shared by the prompt builder and the UI. Kept in their own
 * tiny module so the UI can warn about truncation without loading prompts.
 */

/** Keep requests inside free-tier context limits; long CVs are rarely > 12k chars. */
export const MAX_INPUT_CHARS = 12_000;

/** The text as it is sent: Windows line breaks unified and long blank runs squeezed. */
export function normalizeInput(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function clip(text: string, max = MAX_INPUT_CHARS): string {
  const t = normalizeInput(text);
  return t.length <= max ? t : `${t.slice(0, max)}\n[…truncated]`;
}

export interface Truncation {
  field: 'cv' | 'job';
  length: number;
}

/** Which inputs will be cut before being sent to an LLM, and how long they are. */
export function truncatedInputs(cv: string, job: string, max = MAX_INPUT_CHARS): Truncation[] {
  const out: Truncation[] = [];
  const c = normalizeInput(cv).length;
  const j = normalizeInput(job).length;
  if (c > max) out.push({ field: 'cv', length: c });
  if (j > max) out.push({ field: 'job', length: j });
  return out;
}

export function truncationMessage(t: Truncation, max = MAX_INPUT_CHARS): string {
  const what = t.field === 'cv' ? 'Your CV' : 'The job ad';
  return `${what} is ${t.length.toLocaleString('en')} characters; only the first ${max.toLocaleString('en')} are sent to the model, so the end is not analysed.`;
}
