// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { analysisKey, clearHistory, forgetKeys, KEYS, loadHistory, loadSettings, mergeHistory, pushHistory, saveSettings } from './storage';
import { finalize } from '../analyzer/finalize';
import { analyzeOffline } from '../analyzer/offline';
import { SAMPLE_CV, SAMPLE_JOB } from '../data/samples';
import { DEFAULT_SETTINGS } from '../providers/types';
import type { AnalysisResult } from '../types';

const NOW = new Date('2026-09-23T10:00:00Z');
const result = (): AnalysisResult =>
  finalize(analyzeOffline(SAMPLE_CV, SAMPLE_JOB, 'en', NOW), { cv: SAMPLE_CV, language: 'en', provider: 'offline', model: null, now: NOW });

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('history', () => {
  it('round-trips valid entries under a versioned key', async () => {
    const r = result();
    pushHistory(r, []);
    expect(localStorage.getItem(KEYS.history)).toContain(r.id);
    const loaded = await loadHistory();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]!.scoreDetails).toEqual(r.scoreDetails);
  });

  it('drops invalid entries instead of crashing', async () => {
    const good = result();
    const bad = [{ id: 'x' }, 'nope', { ...good, id: 'bad-score', scoreDetails: { score: 'high' } }, null];
    localStorage.setItem(KEYS.history, JSON.stringify([good, ...bad]));
    const loaded = await loadHistory();
    expect(loaded.map((h) => h.id)).toEqual([good.id]);
    // The cleaned list is written back.
    expect(JSON.parse(localStorage.getItem(KEYS.history)!)).toHaveLength(1);
  });

  it('survives a corrupted value and migrates the v1 key (adding promptVersion)', async () => {
    localStorage.setItem(KEYS.history, '{not json');
    expect(await loadHistory()).toEqual([]);
    localStorage.clear();
    const { promptVersion: _dropped, ...v1 } = result();
    localStorage.setItem(KEYS.legacyHistory, JSON.stringify([v1]));
    const loaded = await loadHistory();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]!.promptVersion).toBeNull();
    expect(localStorage.getItem(KEYS.legacyHistory)).toBeNull();
    clearHistory();
    expect(await loadHistory()).toEqual([]);
  });
});

describe('history dedupe', () => {
  const at = (iso: string, inputKey?: string): AnalysisResult => ({ ...result(), id: `id-${iso}`, createdAt: iso, inputKey });

  it('keys an analysis by its texts, language and provider/model', () => {
    const k = analysisKey(SAMPLE_CV, SAMPLE_JOB, 'en', DEFAULT_SETTINGS);
    expect(analysisKey(`  ${SAMPLE_CV}  `, SAMPLE_JOB, 'en', DEFAULT_SETTINGS)).toBe(k);
    expect(analysisKey(SAMPLE_CV, SAMPLE_JOB, 'fr', DEFAULT_SETTINGS)).not.toBe(k);
    expect(analysisKey(SAMPLE_CV, `${SAMPLE_JOB} Docker`, 'en', DEFAULT_SETTINGS)).not.toBe(k);
    const gemini = { ...DEFAULT_SETTINGS, provider: 'gemini' as const };
    expect(analysisKey(SAMPLE_CV, SAMPLE_JOB, 'en', gemini)).not.toBe(k);
    expect(analysisKey(SAMPLE_CV, SAMPLE_JOB, 'en', { ...gemini, gemini: { ...gemini.gemini, model: 'other' } })).not.toBe(
      analysisKey(SAMPLE_CV, SAMPLE_JOB, 'en', gemini),
    );
    // The API key is not part of it.
    expect(analysisKey(SAMPLE_CV, SAMPLE_JOB, 'en', { ...gemini, gemini: { ...gemini.gemini, apiKey: 'x' } })).toBe(
      analysisKey(SAMPLE_CV, SAMPLE_JOB, 'en', gemini),
    );
  });

  it('replaces the same analysis instead of adding a duplicate, moving it to the top', () => {
    let h = pushHistory(at('2026-09-20T10:00:00Z', 'same'), []);
    h = pushHistory(at('2026-09-21T10:00:00Z', 'other'), h);
    h = pushHistory(at('2026-09-22T10:00:00Z', 'same'), h);
    expect(h.map((e) => [e.inputKey, e.createdAt])).toEqual([
      ['same', '2026-09-22T10:00:00Z'],
      ['other', '2026-09-21T10:00:00Z'],
    ]);
    expect(JSON.parse(localStorage.getItem(KEYS.history)!)).toHaveLength(2);
  });

  it('keeps entries saved before keys existed', () => {
    const h = pushHistory(at('2026-09-22T10:00:00Z'), [at('2026-09-20T10:00:00Z')]);
    expect(h).toHaveLength(2);
  });

  it('merges loaded and new entries by key, newest first', () => {
    const merged = mergeHistory([at('2026-09-22T10:00:00Z', 'k')], [at('2026-09-20T10:00:00Z', 'k'), at('2026-09-21T10:00:00Z', 'j')]);
    expect(merged.map((e) => e.createdAt)).toEqual(['2026-09-22T10:00:00Z', '2026-09-21T10:00:00Z']);
  });

  it('stores the key and reads it back', async () => {
    pushHistory(at('2026-09-22T10:00:00Z', 'abc123'), []);
    expect((await loadHistory())[0]!.inputKey).toBe('abc123');
  });
});

describe('API keys', () => {
  const withKey = { ...DEFAULT_SETTINGS, provider: 'gemini' as const, gemini: { ...DEFAULT_SETTINGS.gemini, apiKey: 'AIza-secret' } };

  it('keeps keys in sessionStorage by default, never in localStorage', () => {
    saveSettings(withKey);
    expect(JSON.stringify({ ...localStorage })).not.toContain('AIza-secret');
    expect(sessionStorage.getItem(KEYS.apiKeys)).toContain('AIza-secret');
    expect(loadSettings()).toMatchObject({ provider: 'gemini', rememberKeys: false, gemini: { apiKey: 'AIza-secret' } });
  });

  it('keeps them in localStorage only when "remember" is on', () => {
    saveSettings({ ...withKey, rememberKeys: true });
    expect(localStorage.getItem(KEYS.apiKeys)).toContain('AIza-secret');
    expect(sessionStorage.getItem(KEYS.apiKeys)).toBeNull();
    sessionStorage.clear(); // a new browser session
    expect(loadSettings()).toMatchObject({ rememberKeys: true, gemini: { apiKey: 'AIza-secret' } });
    // Turning it off removes the persistent copy.
    saveSettings({ ...withKey, rememberKeys: false });
    expect(localStorage.getItem(KEYS.apiKeys)).toBeNull();
  });

  it('moves keys out of v1 settings into the session', () => {
    localStorage.setItem(KEYS.legacySettings, JSON.stringify({ ...withKey, rememberKeys: undefined }));
    const s = loadSettings();
    expect(s).toMatchObject({ provider: 'gemini', rememberKeys: false, gemini: { apiKey: 'AIza-secret' } });
    expect(JSON.stringify({ ...localStorage })).not.toContain('AIza-secret');
    expect(localStorage.getItem(KEYS.legacySettings)).toBeNull();
  });

  it('forgetKeys removes them everywhere', () => {
    saveSettings({ ...withKey, rememberKeys: true });
    const s = forgetKeys(loadSettings());
    expect(s.gemini.apiKey).toBe('');
    expect(localStorage.getItem(KEYS.apiKeys)).toBeNull();
    expect(sessionStorage.getItem(KEYS.apiKeys)).toBeNull();
    expect(loadSettings().gemini.apiKey).toBe('');
  });
});
