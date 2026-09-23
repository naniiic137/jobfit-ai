import { DEFAULT_SETTINGS, type ProviderSettings } from '../providers/types';
import type { AnalysisResult, OutputLanguage } from '../types';

/**
 * Keys are versioned: when the stored shape changes, the version changes and
 * old data is migrated (or dropped) instead of crashing the app.
 */
export const KEYS = {
  settings: 'jobfit.settings.v2',
  /** API keys, kept apart from the other settings (sessionStorage unless "remember" is on). */
  apiKeys: 'jobfit.keys.v1',
  history: 'jobfit.history.v2',
  theme: 'jobfit.theme',
  draft: 'jobfit.draft.v1',
  legacySettings: 'jobfit.settings.v1',
  legacyHistory: 'jobfit.history.v1',
} as const;

export const HISTORY_LIMIT = 20;

type Area = 'local' | 'session';

function area(a: Area): Storage | null {
  try {
    return a === 'local' ? globalThis.localStorage : globalThis.sessionStorage;
  } catch {
    return null; // access can throw when storage is blocked
  }
}

function read<T>(key: string, a: Area = 'local'): T | null {
  try {
    const raw = area(a)?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown, a: Area = 'local'): void {
  try {
    area(a)?.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked (private mode): the app still works, it just forgets */
  }
}

function remove(key: string, a: Area = 'local'): void {
  try {
    area(a)?.removeItem(key);
  } catch {
    /* ignore */
  }
}

// ── Settings & API keys ─────────────────────────────────────────────────────

interface ApiKeys {
  gemini: string;
  openai: string;
}

type StoredSettings = Partial<Omit<ProviderSettings, 'gemini' | 'openai'>> & {
  gemini?: Partial<ProviderSettings['gemini']>;
  openai?: Partial<ProviderSettings['openai']>;
};

/** v1 kept the API keys inside the settings in localStorage. Move them to the session. */
function migrateLegacySettings(): void {
  const legacy = read<StoredSettings>(KEYS.legacySettings);
  if (!legacy) return;
  const keys: ApiKeys = { gemini: legacy.gemini?.apiKey ?? '', openai: legacy.openai?.apiKey ?? '' };
  if (!read(KEYS.settings)) write(KEYS.settings, { ...legacy, rememberKeys: false, gemini: { ...legacy.gemini, apiKey: '' }, openai: { ...legacy.openai, apiKey: '' } });
  if ((keys.gemini || keys.openai) && !read(KEYS.apiKeys, 'session')) write(KEYS.apiKeys, keys, 'session');
  remove(KEYS.legacySettings);
}

export function loadSettings(): ProviderSettings {
  migrateLegacySettings();
  const s = read<StoredSettings>(KEYS.settings);
  const remembered = read<ApiKeys>(KEYS.apiKeys, 'local');
  const keys = remembered ?? read<ApiKeys>(KEYS.apiKeys, 'session');
  return {
    provider: s?.provider ?? DEFAULT_SETTINGS.provider,
    rememberKeys: Boolean(remembered) || s?.rememberKeys === true,
    gemini: { ...DEFAULT_SETTINGS.gemini, ...s?.gemini, apiKey: keys?.gemini ?? '' },
    ollama: { ...DEFAULT_SETTINGS.ollama, ...s?.ollama },
    openai: { ...DEFAULT_SETTINGS.openai, ...s?.openai, apiKey: keys?.openai ?? '' },
  };
}

/**
 * Settings go to localStorage WITHOUT the keys. Keys go to sessionStorage
 * (gone when the browser closes) unless the user ticked "Remember keys".
 */
export function saveSettings(s: ProviderSettings): void {
  write(KEYS.settings, { ...s, gemini: { ...s.gemini, apiKey: '' }, openai: { ...s.openai, apiKey: '' } });
  const keys: ApiKeys = { gemini: s.gemini.apiKey, openai: s.openai.apiKey };
  const hasKey = Boolean(keys.gemini || keys.openai);
  if (s.rememberKeys && hasKey) {
    write(KEYS.apiKeys, keys, 'local');
    remove(KEYS.apiKeys, 'session');
  } else {
    remove(KEYS.apiKeys, 'local');
    if (hasKey) write(KEYS.apiKeys, keys, 'session');
    else remove(KEYS.apiKeys, 'session');
  }
}

/** Remove every stored API key but keep the other preferences. */
export function forgetKeys(s: ProviderSettings): ProviderSettings {
  const next: ProviderSettings = {
    ...s,
    gemini: { ...s.gemini, apiKey: '' },
    openai: { ...s.openai, apiKey: '' },
  };
  remove(KEYS.apiKeys, 'local');
  remove(KEYS.apiKeys, 'session');
  saveSettings(next);
  return next;
}

// ── History ────────────────────────────────────────────────────────────────

/** The raw stored entries (current key, or the v1 key before its first migration). */
export function readRawHistory(): unknown {
  return read<unknown>(KEYS.history) ?? read<unknown>(KEYS.legacyHistory);
}

export function saveHistory(history: AnalysisResult[]): void {
  write(KEYS.history, history.slice(0, HISTORY_LIMIT));
  remove(KEYS.legacyHistory);
}

/**
 * History is validated with zod before the UI touches it: entries that were
 * written by an older version, edited by hand or corrupted are dropped
 * instead of crashing the results view. The validator is loaded lazily so
 * the offline path does not ship zod up front. The raw value is read before
 * the import, so an analysis saved in the meantime cannot be lost.
 */
export async function loadHistory(): Promise<AnalysisResult[]> {
  const raw = readRawHistory();
  const { parseHistory } = await import('./historySchema');
  const valid = parseHistory(raw).slice(0, HISTORY_LIMIT);
  saveHistory(valid);
  return valid;
}

/**
 * Identifies an analysis by what went into it: both texts, the output
 * language and the provider/model/endpoint. Running the same analysis again
 * gives the same key, so history keeps one entry for it. (cyrb53 hash: short
 * and fast; the texts themselves are not stored twice.)
 */
export function analysisKey(cv: string, job: string, language: OutputLanguage, s: ProviderSettings): string {
  const model =
    s.provider === 'gemini' ? s.gemini.model : s.provider === 'ollama' ? `${s.ollama.baseUrl}|${s.ollama.model}` : s.provider === 'openai' ? `${s.openai.baseUrl}|${s.openai.model}` : '';
  const text = JSON.stringify([cv.trim(), job.trim(), language, s.provider, model.trim()]);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

const sameAnalysis = (a: AnalysisResult, b: AnalysisResult) => a.id === b.id || (a.inputKey !== undefined && a.inputKey === b.inputKey);

/** Newest first; one entry per id and per analysis key (the newest wins). */
export function mergeHistory(a: AnalysisResult[], b: AnalysisResult[]): AnalysisResult[] {
  const kept: AnalysisResult[] = [];
  for (const h of [...a, ...b].sort((x, y) => y.createdAt.localeCompare(x.createdAt))) {
    if (!kept.some((k) => sameAnalysis(k, h))) kept.push(h);
  }
  return kept.slice(0, HISTORY_LIMIT);
}

/**
 * Adds an analysis at the top. Re-running the same analysis (same key)
 * replaces the older entry instead of adding a duplicate, so it simply
 * moves to the top with the new date.
 */
export function pushHistory(entry: AnalysisResult, history: AnalysisResult[]): AnalysisResult[] {
  const next = [entry, ...history.filter((h) => !sameAnalysis(h, entry))].slice(0, HISTORY_LIMIT);
  saveHistory(next);
  return next;
}

export function removeHistory(id: string, history: AnalysisResult[]): AnalysisResult[] {
  const next = history.filter((h) => h.id !== id);
  saveHistory(next);
  return next;
}

export function clearHistory(): void {
  remove(KEYS.history);
  remove(KEYS.legacyHistory);
}

// ── Theme & draft ──────────────────────────────────────────────────────────

export type Theme = 'light' | 'dark';

export function loadTheme(): Theme | null {
  const t = read<Theme>(KEYS.theme);
  return t === 'light' || t === 'dark' ? t : null;
}

export function saveTheme(t: Theme): void {
  write(KEYS.theme, t);
}

export interface Draft {
  cv: string;
  job: string;
}

export function loadDraft(): Draft {
  const d = read<Partial<Draft>>(KEYS.draft);
  return { cv: typeof d?.cv === 'string' ? d.cv : '', job: typeof d?.job === 'string' ? d.job : '' };
}

export function saveDraft(d: Draft): void {
  write(KEYS.draft, d);
}
