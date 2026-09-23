import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { SkillCategory } from '../schemas/analysis';
import type { AnalysisResult, VerifiedSkill } from '../types';
import { copyText, coverLetterMarkdown, downloadText, slug } from '../lib/download';
import { LOW_COVERAGE, skillWeight } from '../analyzer/score';
import { ScoreGauge } from './ScoreGauge';
import {
  IconAlert,
  IconCheck,
  IconCopy,
  IconDownload,
  IconMessage,
  IconPen,
  IconFile,
} from './Icons';

export const CATEGORY_LABEL: Record<SkillCategory, string> = {
  language: 'Languages',
  frontend: 'Frontend',
  backend: 'Backend',
  database: 'Data',
  devops: 'DevOps',
  ai: 'AI & ML',
  tool: 'Tools',
  practice: 'Practices',
  soft: 'Soft skills',
  other: 'Other',
};

const PROVIDER_LABEL: Record<AnalysisResult['provider'], string> = {
  offline: 'Offline demo',
  gemini: 'Gemini',
  ollama: 'Ollama',
  openai: 'OpenAI-compatible',
};

type Tab = 'bullets' | 'letter' | 'interview';
const TABS: Array<{ id: Tab; label: string; icon: ReactNode }> = [
  { id: 'bullets', label: 'Tailored bullets', icon: <IconPen /> },
  { id: 'letter', label: 'Cover letter', icon: <IconFile /> },
  { id: 'interview', label: 'Interview prep', icon: <IconMessage /> },
];

export function Results({ result, initialTab = 'bullets' }: { result: AnalysisResult; initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const baseId = useId();
  const d = result.scoreDetails;
  const bySkillWeight = (a: VerifiedSkill, b: VerifiedSkill) => skillWeight(b) - skillWeight(a);
  const matched = result.skills.filter((s) => s.inCv && s.verified).sort(bySkillWeight);
  // An LLM said "in your CV" but its quote is not in the CV: shown apart, never scored.
  const claimed = result.skills.filter((s) => s.inCv && !s.verified).sort(bySkillWeight);
  const missing = result.skills.filter((s) => !s.inCv).sort(bySkillWeight);
  const recognised = result.skills.length;
  const lowCoverage = recognised < LOW_COVERAGE;

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = (i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length;
    setTab(TABS[next]!.id);
    tabRefs.current[next]?.focus();
  };

  return (
    <section className="results" aria-labelledby={`${baseId}-title`}>
      <header className="results__head">
        <div>
          <p className="eyebrow">Analysis</p>
          <h2 id={`${baseId}-title`} className="results__title">
            {result.jobTitle ?? 'Job match'}
            {result.company && <span className="results__company"> · {result.company}</span>}
          </h2>
        </div>
        <span
          className={`badge badge--${result.provider}`}
          title={result.model ? `${result.model}${result.promptVersion ? ` · prompt v${result.promptVersion}` : ''}` : undefined}
        >
          {PROVIDER_LABEL[result.provider]}
          {result.model ? ` · ${result.model}` : ''}
        </span>
      </header>

      <div className="results__grid">
        <article className="card card--score">
          <ScoreGauge score={d.score} />
          <div className="score__text">
            <p className="score__summary">{result.summary}</p>
            <dl className="stats">
              <div>
                <dt>Required</dt>
                <dd>
                  <strong>{d.requiredMatched}</strong>/{d.requiredTotal}
                </dd>
              </div>
              <div>
                <dt>Nice to have</dt>
                <dd>
                  <strong>{d.niceMatched}</strong>/{d.niceTotal}
                </dd>
              </div>
              <div>
                <dt>Missing</dt>
                <dd>
                  <strong>{missing.length + claimed.length}</strong>
                </dd>
              </div>
            </dl>
            <p className={`coverage${lowCoverage ? ' coverage--low' : ''}`} role="note">
              {result.provider === 'offline'
                ? `Recognised ${recognised} skill${recognised === 1 ? '' : 's'} in this ad; others aren't scored.`
                : `The model listed ${recognised} skill${recognised === 1 ? '' : 's'} from this ad.`}
              {lowCoverage &&
                (result.provider === 'offline'
                  ? ' That is too few for a reliable score: the offline list only knows common software skills. Try an LLM provider for this ad.'
                  : ' That is too few for a reliable score.')}
            </p>
            <p className="score__how">
              Scored by the app, not the model: required skills weigh 3×, nice-to-haves 1×, soft skills half. Hover a green chip to see the CV line
              that proves it.
            </p>
          </div>
        </article>

        <article className="card card--breakdown" aria-label="Coverage by category">
          <h3 className="card__title">Coverage by category</h3>
          <ul className="bars">
            {result.breakdown.map((b) => {
              const pct = b.total ? Math.round((b.matched / b.total) * 100) : 0;
              return (
                <li key={b.category} className="bar">
                  <span className="bar__label">{CATEGORY_LABEL[b.category]}</span>
                  <span className="bar__track" aria-hidden="true">
                    <span className="bar__fill" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="bar__value">
                    {b.matched}/{b.total}
                  </span>
                </li>
              );
            })}
          </ul>
        </article>

        <article className="card card--skills">
          <div className="skills__col">
            <h3 className="card__title">
              <span className="dot dot--ok" aria-hidden="true" /> Matched <span className="count">{matched.length}</span>
            </h3>
            <ul className="chips" aria-label="Matched skills">
              {matched.map((s) => (
                <li key={s.name} className="chip chip--ok" title={s.evidence ? `From your CV: “${s.evidence}”` : undefined}>
                  <IconCheck width={14} height={14} />
                  {s.name}
                  {s.importance === 'nice' && <span className="chip__tag">nice</span>}
                </li>
              ))}
              {!matched.length && <li className="muted">No overlap found yet.</li>}
            </ul>
            {claimed.length > 0 && (
              <>
                <h4 className="skills__sub">
                  Claimed by the model, not found in your CV <span className="count">{claimed.length}</span>
                </h4>
                <p className="muted small">Its quote is not in your CV text, so these earn no points. Add them to your CV only if they are true.</p>
                <ul className="chips" aria-label="Claimed by the model but not found in your CV">
                  {claimed.map((s) => (
                    <li
                      key={s.name}
                      className="chip chip--claimed"
                      title={s.evidence ? `The model quoted: “${s.evidence}” (not found in your CV)` : 'The model gave no quote from your CV'}
                    >
                      <IconAlert width={14} height={14} />
                      {s.name}
                      <span className="chip__tag chip__tag--warn">claimed, not found in CV</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <div className="skills__col">
            <h3 className="card__title">
              <span className="dot dot--miss" aria-hidden="true" /> Missing <span className="count">{missing.length}</span>
            </h3>
            <ul className="chips" aria-label="Missing skills">
              {missing.map((s) => (
                <li key={s.name} className={`chip ${s.importance === 'required' ? 'chip--miss' : 'chip--nice'}`}>
                  {s.importance === 'required' ? <IconAlert width={14} height={14} /> : <span className="chip__plus">+</span>}
                  {s.name}
                  <span className="chip__tag">{s.importance === 'required' ? 'required' : 'nice'}</span>
                </li>
              ))}
              {!missing.length && <li className="muted">Nothing missing. Nice.</li>}
            </ul>
          </div>
          {result.notes.length > 0 && (
            <ul className="notes">
              {result.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
        </article>
      </div>

      <div className="card card--tabs">
        <div role="tablist" aria-label="Suggestions" className="tabs">
          {TABS.map((t, i) => (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              role="tab"
              id={`${baseId}-tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`${baseId}-panel-${t.id}`}
              tabIndex={tab === t.id ? 0 : -1}
              className="tab"
              onClick={() => setTab(t.id)}
              onKeyDown={(e) => onTabKey(e, i)}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`${baseId}-panel-${tab}`} aria-labelledby={`${baseId}-tab-${tab}`} className="tabpanel" tabIndex={0}>
          {tab === 'bullets' && <Bullets result={result} />}
          {tab === 'letter' && <CoverLetter result={result} />}
          {tab === 'interview' && <Interview result={result} />}
        </div>
      </div>
    </section>
  );
}

function Bullets({ result }: { result: AnalysisResult }) {
  if (!result.bulletSuggestions.length) return <p className="muted">No bullet suggestions for this CV.</p>;
  return (
    <ol className="suggestions">
      {result.bulletSuggestions.map((b, i) => (
        <li key={i} className="suggestion">
          {b.original ? (
            <div className="diff">
              <p className="diff__before">
                <span className="diff__tag">Before</span>
                <span className="diff__text">{b.original}</span>
              </p>
              <p className="diff__after">
                <span className="diff__tag">After</span>
                <span className="diff__text">
                  <Placeholders text={b.suggestion} />
                </span>
              </p>
            </div>
          ) : (
            <p className="diff__gap">
              <span className="diff__tag diff__tag--gap">Gap</span>
              <span className="diff__text">
                <Placeholders text={b.suggestion} />
              </span>
            </p>
          )}
          <p className="suggestion__why">{b.reason}</p>
        </li>
      ))}
    </ol>
  );
}

/** Highlight "[add a real result …]" placeholders so they are never sent as-is. */
function Placeholders({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\])/g);
  return (
    <>
      {parts.map((p, i) =>
        /^\[.*\]$/.test(p) ? (
          <mark key={i} className="placeholder">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function CoverLetter({ result }: { result: AnalysisResult }) {
  const [copied, setCopied] = useState(false);
  const name = `cover-letter-${slug(result.company ?? result.jobTitle)}`;
  const onCopy = async () => {
    if (await copyText(result.coverLetter)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };
  const words = result.coverLetter.trim().split(/\s+/).length;
  return (
    <div className="letter">
      <div className="letter__toolbar">
        <span className="muted">
          {words} words · {result.language === 'fr' ? 'Français' : 'English'}
        </span>
        <div className="btn-row">
          <button type="button" className="btn btn--ghost" onClick={onCopy}>
            {copied ? <IconCheck /> : <IconCopy />} {copied ? 'Copied' : 'Copy'}
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => downloadText(`${name}.txt`, result.coverLetter)}>
            <IconDownload /> .txt
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => downloadText(`${name}.md`, coverLetterMarkdown(result.coverLetter, result.jobTitle, result.company), 'text/markdown')}
          >
            <IconDownload /> .md
          </button>
        </div>
      </div>
      <article className="letter__paper" aria-label="Cover letter draft">
        {result.coverLetter.split(/\n{2,}/).map((p, i) => (
          <p key={i}>
            <Placeholders text={p} />
          </p>
        ))}
      </article>
      <p className="muted small">Draft only: read it, make it yours, and check every claim before sending.</p>
    </div>
  );
}

function Interview({ result }: { result: AnalysisResult }) {
  return (
    <ol className="questions">
      {result.interviewQuestions.map((q, i) => (
        <li key={i} className="question">
          <p className="question__q">{q.question}</p>
          <p className="question__why">
            <strong>Why they ask:</strong> {q.why}
          </p>
          <p className="question__tip">
            <strong>Tip:</strong> {q.tip}
          </p>
        </li>
      ))}
    </ol>
  );
}
