import { DEFAULT_SETTINGS, type ProviderSettings } from '../providers/types';
import type { AnalysisResult } from '../types';

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

/** Newest first, no duplicate ids. */
export function mergeHistory(a: AnalysisResult[], b: AnalysisResult[]): AnalysisResult[] {
  const seen = new Set<string>();
  return [...a, ...b]
    .filter((h) => (seen.has(h.id) ? false : (seen.add(h.id), true)))
    .sort((x, y) => y.createdAt.localeCompare(x.createdAt))
    .slice(0, HISTORY_LIMIT);
}

export function pushHistory(entry: AnalysisResult, history: AnalysisResult[]): AnalysisResult[] {
  const next = [entry, ...history.filter((h) => h.id !== entry.id)].slice(0, HISTORY_LIMIT);
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
