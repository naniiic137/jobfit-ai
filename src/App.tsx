import { useCallback, useEffect, useRef, useState } from 'react';
import { Results } from './components/Results';
import { SettingsDialog } from './components/SettingsDialog';
import { HistoryDialog } from './components/HistoryDialog';
import {
  IconArrowRight,
  IconBriefcase,
  IconFile,
  IconGithub,
  IconHistory,
  IconMoon,
  IconSettings,
  IconSparkles,
  IconSun,
  IconUpload,
} from './components/Icons';
import { SAMPLE_CV, SAMPLE_JOB } from './data/samples';
import {
  clearHistory,
  forgetKeys,
  loadDraft,
  loadHistory,
  mergeHistory,
  loadSettings,
  loadTheme,
  pushHistory,
  removeHistory,
  saveDraft,
  saveHistory,
  saveSettings,
  saveTheme,
  type Theme,
} from './lib/storage';
import { runAnalysis } from './providers/run';
import { truncatedInputs, truncationMessage } from './prompts/limits';
import { ProviderError, type ProviderSettings } from './providers/types';
import type { AnalysisResult, OutputLanguage } from './types';

const PROVIDER_SHORT: Record<ProviderSettings['provider'], string> = {
  offline: 'Offline demo',
  gemini: 'Gemini',
  ollama: 'Ollama',
  openai: 'OpenAI-compatible',
};

const MIN_CHARS = 80;

function initialTheme(): Theme {
  const saved = loadTheme();
  if (saved) return saved;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function App() {
  const [settings, setSettings] = useState<ProviderSettings>(loadSettings);
  const [cv, setCv] = useState(() => loadDraft().cv);
  const [job, setJob] = useState(() => loadDraft().job);
  const [lang, setLang] = useState<OutputLanguage>('en');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<{ message: string; hint?: string } | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [dialog, setDialog] = useState<'settings' | 'history' | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // History is validated (lazily, with zod) before it is shown; invalid entries are dropped.
  useEffect(() => {
    let alive = true;
    void loadHistory().then((loaded) => {
      if (!alive) return;
      // Keep anything analysed while the validator was loading.
      setHistory((current) => {
        const merged = mergeHistory(current, loaded);
        if (merged.length !== loaded.length) saveHistory(merged);
        return merged;
      });
    });
    return () => {
      alive = false;
    };
  }, []);

  // Never leave a request running after the app goes away.
  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    const t = setTimeout(() => saveDraft({ cv, job }), 400);
    return () => clearTimeout(t);
  }, [cv, job]);

  const canAnalyze = cv.trim().length >= MIN_CHARS && job.trim().length >= MIN_CHARS && !busy;
  // Only LLM providers clip the input; the offline analyzer reads everything.
  const truncated = settings.provider === 'offline' ? [] : truncatedInputs(cv, job);

  const analyze = useCallback(async () => {
    setError(null);
    setBusy(true);
    setStatus(settings.provider === 'offline' ? 'Analysing…' : `Asking ${PROVIDER_SHORT[settings.provider]}…`);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const { result: r, info } = await runAnalysis(settings, cv, job, lang, ctrl.signal);
      setResult(r);
      setHistory((h) => pushHistory(r, h));
      setStatus(`Analysis ready: score ${r.scoreDetails.score} out of 100${info?.repaired ? ' (model output was repaired once)' : ''}.`);
      requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        setStatus('Analysis cancelled.');
        return;
      }
      const pe = e instanceof ProviderError ? e : null;
      setError({ message: (e as Error).message, hint: pe?.hint });
      setStatus('');
    } finally {
      setBusy(false);
    }
  }, [settings, cv, job, lang]);

  const onPdf = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setPdfBusy(true);
    try {
      const { pdfToText } = await import('./lib/pdf');
      const text = await pdfToText(file);
      if (text.length < 40) {
        setError({ message: 'Could not read text from this PDF.', hint: 'It may be a scanned image. Copy-paste the text instead.' });
      } else {
        setCv(text);
      }
    } catch (e) {
      setError({ message: `PDF import failed: ${(e as Error).message}` });
    } finally {
      setPdfBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const loadSample = () => {
    setCv(SAMPLE_CV);
    setJob(SAMPLE_JOB);
    setError(null);
  };

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="topbar">
        <div className="container topbar__inner">
          <a className="brand" href="./" aria-label="JobFit AI home">
            <span className="brand__mark" aria-hidden="true">
              <IconSparkles width={18} height={18} />
            </span>
            <span className="brand__name">
              JobFit <span className="brand__ai">AI</span>
            </span>
          </a>
          <nav className="topbar__actions" aria-label="App">
            <button type="button" className="pill" onClick={() => setDialog('settings')} aria-label={`AI provider: ${PROVIDER_SHORT[settings.provider]}. Change`}>
              <span className={`pill__dot pill__dot--${settings.provider}`} aria-hidden="true" />
              <span className="pill__text">{PROVIDER_SHORT[settings.provider]}</span>
              <IconSettings width={16} height={16} />
            </button>
            <button type="button" className="icon-btn" onClick={() => setDialog('history')} aria-label={`History (${history.length})`}>
              <IconHistory />
              {history.length > 0 && <span className="icon-btn__badge">{history.length}</span>}
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {theme === 'dark' ? <IconSun /> : <IconMoon />}
            </button>
            <a className="icon-btn hide-sm" href="https://github.com/naniiic137/jobfit-ai" target="_blank" rel="noreferrer" aria-label="Source code on GitHub">
              <IconGithub />
            </a>
          </nav>
        </div>
      </header>

      <main id="main" className="container">
        <section className="hero">
          <h1>
            Does your CV <span className="grad">fit the job</span>?
          </h1>
          <p className="hero__sub">
            Paste your CV and a job ad. Get a match score, the skills you are missing, sharper CV bullets, a cover-letter draft and likely interview
            questions. Works offline, or with a free LLM. It never invents experience you don&apos;t have.
          </p>
        </section>

        <section className="inputs" aria-label="Inputs">
          <div className="card input-card">
            <div className="input-card__head">
              <label htmlFor="cv" className="input-card__title">
                <IconFile /> Your CV
              </label>
              <div className="btn-row">
                <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="sr-only" id="cv-pdf" onChange={(e) => onPdf(e.target.files?.[0])} />
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => fileRef.current?.click()} disabled={pdfBusy}>
                  <IconUpload width={16} height={16} /> {pdfBusy ? 'Reading…' : 'Upload PDF'}
                </button>
                {cv && (
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setCv('')}>
                    Clear
                  </button>
                )}
              </div>
            </div>
            <textarea
              id="cv"
              value={cv}
              onChange={(e) => setCv(e.target.value)}
              placeholder={'Paste your CV as plain text…\n\nTip: bullet points (- or •) give the best suggestions.'}
              spellCheck={false}
            />
            <p className="input-card__foot">
              <span>{cv.trim() ? `${cv.trim().split(/\s+/).length} words` : 'PDF text is extracted in your browser.'}</span>
            </p>
          </div>

          <div className="card input-card">
            <div className="input-card__head">
              <label htmlFor="job" className="input-card__title">
                <IconBriefcase /> Job ad
              </label>
              {job && (
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setJob('')}>
                  Clear
                </button>
              )}
            </div>
            <textarea
              id="job"
              value={job}
              onChange={(e) => setJob(e.target.value)}
              placeholder={'Paste the full job ad, including “Requirements” and “Nice to have” sections…'}
              spellCheck={false}
            />
            <p className="input-card__foot">
              <span>{job.trim() ? `${job.trim().split(/\s+/).length} words` : 'English or French ads both work.'}</span>
            </p>
          </div>
        </section>

        <div className="actions">
          <button type="button" className="btn btn--soft" onClick={loadSample}>
            <IconSparkles width={16} height={16} /> Try the sample CV + job ad
          </button>
          <div className="actions__right">
            <div className="segmented" role="radiogroup" aria-label="Output language">
              {(['en', 'fr'] as const).map((l) => (
                <button key={l} type="button" role="radio" aria-checked={lang === l} className="segmented__btn" onClick={() => setLang(l)}>
                  {l === 'en' ? 'English' : 'Français'}
                </button>
              ))}
            </div>
            {busy && settings.provider !== 'offline' && (
              <button type="button" className="btn btn--ghost btn--lg" onClick={() => abortRef.current?.abort()}>
                Cancel
              </button>
            )}
            <button type="button" className="btn btn--primary btn--lg" onClick={analyze} disabled={!canAnalyze} aria-busy={busy}>
              {busy ? <span className="spinner" aria-hidden="true" /> : <IconArrowRight />}
              {busy ? 'Analysing…' : 'Analyse match'}
            </button>
          </div>
        </div>
        {!canAnalyze && !busy && (cv || job) && (
          <p className="hint">Both texts need at least {MIN_CHARS} characters.</p>
        )}
        {truncated.map((t) => (
          <p key={t.field} className="hint hint--warn" role="note">
            {truncationMessage(t)}
          </p>
        ))}

        <p className="sr-only" role="status" aria-live="polite">
          {status}
        </p>

        {error && (
          <div className="alert" role="alert">
            <strong>{error.message}</strong>
            {error.hint && <p>{error.hint}</p>}
          </div>
        )}

        <div ref={resultsRef} className="results-anchor">
          {result && <Results key={result.id} result={result} />}
        </div>
      </main>

      <footer className="footer">
        <div className="container footer__inner">
          <p>
            JobFit AI · built by{' '}
            <a href="https://github.com/naniiic137" target="_blank" rel="noreferrer">
              Hamza Ben Ismail
            </a>
          </p>
          <p className="muted">No backend, no tracking. Your CV stays in your browser unless you choose an AI provider.</p>
        </div>
      </footer>

      <SettingsDialog
        open={dialog === 'settings'}
        onClose={() => setDialog(null)}
        settings={settings}
        onSave={(s) => {
          setSettings(s);
          saveSettings(s);
          setDialog(null);
        }}
        onForgetKeys={() => setSettings((s) => forgetKeys(s))}
      />
      <HistoryDialog
        open={dialog === 'history'}
        onClose={() => setDialog(null)}
        history={history}
        onOpen={(r) => {
          setResult(r);
          setDialog(null);
          requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
        }}
        onRemove={(id) => setHistory((h) => removeHistory(id, h))}
        onClear={() => {
          clearHistory();
          setHistory([]);
        }}
      />
    </>
  );
}
