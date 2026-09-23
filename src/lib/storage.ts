import { DEFAULT_SETTINGS, type ProviderSettings } from '../providers/types';
import type { AnalysisResult } from '../types';

const KEYS = {
  settings: 'jobfit.settings.v1',
  history: 'jobfit.history.v1',
  theme: 'jobfit.theme',
  draft: 'jobfit.draft.v1',
} as const;

export const HISTORY_LIMIT = 20;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked (private mode): the app still works, it just forgets */
  }
}

export function loadSettings(): ProviderSettings {
  const s = read<Partial<ProviderSettings>>(KEYS.settings);
  return {
    provider: s?.provider ?? DEFAULT_SETTINGS.provider,
    gemini: { ...DEFAULT_SETTINGS.gemini, ...s?.gemini },
    ollama: { ...DEFAULT_SETTINGS.ollama, ...s?.ollama },
    openai: { ...DEFAULT_SETTINGS.openai, ...s?.openai },
  };
}

export function saveSettings(s: ProviderSettings): void {
  write(KEYS.settings, s);
}

/** Remove every stored API key but keep the other preferences. */
export function forgetKeys(s: ProviderSettings): ProviderSettings {
  const next: ProviderSettings = {
    ...s,
    gemini: { ...s.gemini, apiKey: '' },
    openai: { ...s.openai, apiKey: '' },
  };
  saveSettings(next);
  return next;
}

export function loadHistory(): AnalysisResult[] {
  const h = read<AnalysisResult[]>(KEYS.history);
  return Array.isArray(h) ? h : [];
}

export function pushHistory(entry: AnalysisResult, history: AnalysisResult[]): AnalysisResult[] {
  const next = [entry, ...history.filter((h) => h.id !== entry.id)].slice(0, HISTORY_LIMIT);
  write(KEYS.history, next);
  return next;
}

export function removeHistory(id: string, history: AnalysisResult[]): AnalysisResult[] {
  const next = history.filter((h) => h.id !== id);
  write(KEYS.history, next);
  return next;
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(KEYS.history);
  } catch {
    /* ignore */
  }
}

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
  return read<Draft>(KEYS.draft) ?? { cv: '', job: '' };
}

export function saveDraft(d: Draft): void {
  write(KEYS.draft, d);
}
