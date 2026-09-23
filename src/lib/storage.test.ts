// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { clearHistory, forgetKeys, KEYS, loadHistory, loadSettings, pushHistory, saveSettings } from './storage';
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
