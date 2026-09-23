import { useEffect, useState } from 'react';
import type { ProviderSettings } from '../providers/types';
import type { ProviderId } from '../types';
import { OLLAMA_CORS_HINT } from '../providers/ollama';
import { Dialog } from './Dialog';
import { IconShield, IconTrash } from './Icons';

const PROVIDERS: Array<{ id: ProviderId; name: string; blurb: string }> = [
  { id: 'offline', name: 'Offline demo', blurb: 'No key, no network. Keyword matching + templates.' },
  { id: 'gemini', name: 'Google Gemini', blurb: 'Free-tier API key from Google AI Studio.' },
  { id: 'ollama', name: 'Ollama (local)', blurb: 'Runs a model on your own machine.' },
  { id: 'openai', name: 'OpenAI-compatible', blurb: 'Groq, OpenRouter, LM Studio… base URL + key.' },
];

const GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest', 'gemini-2.5-flash'];

export function SettingsDialog({
  open,
  onClose,
  settings,
  onSave,
  onForgetKeys,
}: {
  open: boolean;
  onClose: () => void;
  settings: ProviderSettings;
  onSave: (s: ProviderSettings) => void;
  onForgetKeys: () => void;
}) {
  const [draft, setDraft] = useState(settings);
  const [showKey, setShowKey] = useState(false);
  useEffect(() => {
    if (open) setDraft(settings);
  }, [open, settings]);

  const set = <K extends keyof ProviderSettings>(k: K, v: ProviderSettings[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const hasKey = Boolean(settings.gemini.apiKey || settings.openai.apiKey);

  return (
    <Dialog open={open} onClose={onClose} title="AI provider">
      <form
        className="settings"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(draft);
        }}
      >
        <fieldset className="providers">
          <legend className="sr-only">Provider</legend>
          {PROVIDERS.map((p) => (
            <label key={p.id} className={`provider${draft.provider === p.id ? ' provider--active' : ''}`}>
              <input type="radio" name="provider" value={p.id} checked={draft.provider === p.id} onChange={() => set('provider', p.id)} />
              <span className="provider__name">{p.name}</span>
              <span className="provider__blurb">{p.blurb}</span>
            </label>
          ))}
        </fieldset>

        {draft.provider === 'gemini' && (
          <div className="fields">
            <label className="field">
              <span>API key</span>
              <div className="field__row">
                <input
                  type={showKey ? 'text' : 'password'}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="AIza…"
                  value={draft.gemini.apiKey}
                  onChange={(e) => set('gemini', { ...draft.gemini, apiKey: e.target.value })}
                />
                <button type="button" className="btn btn--ghost" onClick={() => setShowKey((v) => !v)}>
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </div>
              <small>
                Get a free key at{' '}
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
                  aistudio.google.com/apikey
                </a>
                .
              </small>
            </label>
            <label className="field">
              <span>Model</span>
              <input list="gemini-models" value={draft.gemini.model} onChange={(e) => set('gemini', { ...draft.gemini, model: e.target.value })} />
              <datalist id="gemini-models">
                {GEMINI_MODELS.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
              <small>Model names change over time; any Gemini model that supports JSON output works.</small>
            </label>
          </div>
        )}

        {draft.provider === 'ollama' && (
          <div className="fields">
            <label className="field">
              <span>Base URL</span>
              <input value={draft.ollama.baseUrl} onChange={(e) => set('ollama', { ...draft.ollama, baseUrl: e.target.value })} />
            </label>
            <label className="field">
              <span>Model</span>
              <input value={draft.ollama.model} placeholder="llama3.2, qwen2.5, mistral…" onChange={(e) => set('ollama', { ...draft.ollama, model: e.target.value })} />
              <small>Pull it first: <code>ollama pull {draft.ollama.model || 'llama3.2'}</code></small>
            </label>
            <p className="callout">{OLLAMA_CORS_HINT}</p>
          </div>
        )}

        {draft.provider === 'openai' && (
          <div className="fields">
            <label className="field">
              <span>Base URL</span>
              <input value={draft.openai.baseUrl} onChange={(e) => set('openai', { ...draft.openai, baseUrl: e.target.value })} />
              <small>
                Must end before <code>/chat/completions</code>. Groq: <code>https://api.groq.com/openai/v1</code>
              </small>
            </label>
            <label className="field">
              <span>API key</span>
              <div className="field__row">
                <input
                  type={showKey ? 'text' : 'password'}
                  autoComplete="off"
                  spellCheck={false}
                  value={draft.openai.apiKey}
                  onChange={(e) => set('openai', { ...draft.openai, apiKey: e.target.value })}
                />
                <button type="button" className="btn btn--ghost" onClick={() => setShowKey((v) => !v)}>
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>
            <label className="field">
              <span>Model</span>
              <input value={draft.openai.model} onChange={(e) => set('openai', { ...draft.openai, model: e.target.value })} />
            </label>
          </div>
        )}

        {(draft.provider === 'gemini' || draft.provider === 'openai') && (
          <label className="check">
            <input type="checkbox" checked={draft.rememberKeys} onChange={(e) => set('rememberKeys', e.target.checked)} />
            <span>
              Remember API keys on this device
              <small>Off: keys stay in this tab&apos;s session and are gone when you close the browser. On: kept in localStorage.</small>
            </span>
          </label>
        )}

        <div className="privacy">
          <IconShield />
          <p>
            <strong>Privacy.</strong> There is no JobFit server. By default, keys live only in this browser session (sessionStorage) and are sent
            only to the provider you pick, together with your CV and the job ad. Offline mode sends nothing anywhere. On a shared computer, leave
            “Remember” off and use “Forget keys” when you are done.
          </p>
        </div>

        <footer className="dialog__foot">
          <button type="button" className="btn btn--danger" onClick={onForgetKeys} disabled={!hasKey}>
            <IconTrash /> Forget keys
          </button>
          <div className="btn-row">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">
              Save
            </button>
          </div>
        </footer>
      </form>
    </Dialog>
  );
}
