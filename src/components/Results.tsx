import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { AnalysisResult, VerifiedSkill } from '../types';
import { copyText, coverLetterMarkdown, downloadText, slug } from '../lib/download';
import { LOW_COVERAGE, skillWeight } from '../analyzer/score';
import { skillLabel } from '../analyzer/taxonomy';
import { resultStrings, type ResultStrings } from '../i18n';
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

type Tab = 'bullets' | 'letter' | 'interview';
const TABS: Array<{ id: Tab; label: (t: ResultStrings) => string; icon: ReactNode }> = [
  { id: 'bullets', label: (t) => t.tabBullets, icon: <IconPen /> },
  { id: 'letter', label: (t) => t.tabLetter, icon: <IconFile /> },
  { id: 'interview', label: (t) => t.tabInterview, icon: <IconMessage /> },
];

const proofKey = (s: VerifiedSkill) => `${s.verified ? 'ok' : 'claimed'}:${s.name}`;

export function Results({ result, initialTab = 'bullets' }: { result: AnalysisResult; initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  // The chip whose proof is shown. Hover has no touch equivalent, so chips toggle it on tap/click.
  const [proof, setProof] = useState<string | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const baseId = useId();
  const t = resultStrings(result.language);
  const name = (s: VerifiedSkill) => skillLabel(s.name, result.language);
  const d = result.scoreDetails;
  const bySkillWeight = (a: VerifiedSkill, b: VerifiedSkill) => skillWeight(b) - skillWeight(a);
  const matched = result.skills.filter((s) => s.inCv && s.verified).sort(bySkillWeight);
  // An LLM said "in your CV" but its quote is not in the CV: shown apart, never scored.
  const claimed = result.skills.filter((s) => s.inCv && !s.verified).sort(bySkillWeight);
  const missing = result.skills.filter((s) => !s.inCv).sort(bySkillWeight);
  const recognised = result.skills.length;
  const lowCoverage = recognised < LOW_COVERAGE;

  const proofId = `${baseId}-proof`;
  const proofText = (s: VerifiedSkill) =>
    s.verified ? (s.evidence ? t.proofFromCv(s.evidence) : t.proofNoQuote) : s.evidence ? t.proofClaimed(s.evidence) : t.proofClaimedNoQuote;
  const shownProof = [...matched, ...claimed].find((s) => proofKey(s) === proof);
  const chipButton = (s: VerifiedSkill, className: string, children: ReactNode) => (
    <li key={s.name}>
      <button
        type="button"
        className={`chip ${className}`}
        title={proofText(s)}
        aria-expanded={proof === proofKey(s)}
        aria-controls={proofId}
        onClick={() => setProof((p) => (p === proofKey(s) ? null : proofKey(s)))}
      >
        {children}
      </button>
    </li>
  );

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
          <p className="eyebrow">{t.eyebrow}</p>
          <h2 id={`${baseId}-title`} className="results__title" tabIndex={-1}>
            {result.jobTitle ?? t.untitledJob}
            {result.company && (
              <span className="results__company">
                <span className="results__sep"> · </span>
                {result.company}
              </span>
            )}
          </h2>
        </div>
        <span
          className={`badge badge--${result.provider}`}
          title={result.model ? `${result.model}${result.promptVersion ? ` · prompt v${result.promptVersion}` : ''}` : undefined}
        >
          {t.provider[result.provider]}
          {result.model ? ` · ${result.model}` : ''}
        </span>
      </header>

      <div className="results__grid">
        <article className="card card--score">
          <ScoreGauge score={d.score} lang={result.language} />
          <div className="score__text">
            <p className="score__summary">{result.summary}</p>
            <dl className="stats">
              <div>
                <dt>{t.required}</dt>
                <dd>
                  <strong>{d.requiredMatched}</strong>/{d.requiredTotal}
                </dd>
              </div>
              <div>
                <dt>{t.niceToHave}</dt>
                <dd>
                  <strong>{d.niceMatched}</strong>/{d.niceTotal}
                </dd>
              </div>
              <div>
                <dt>{t.missing}</dt>
                <dd>
                  <strong>{missing.length + claimed.length}</strong>
                </dd>
              </div>
            </dl>
            <p className={`coverage${lowCoverage ? ' coverage--low' : ''}`} role="note">
              {result.provider === 'offline' ? t.coverageOffline(recognised) : t.coverageLlm(recognised)}
              {lowCoverage && (result.provider === 'offline' ? t.lowCoverageOffline : t.lowCoverageLlm)}
            </p>
            <p className="score__how">
              {t.scoredBy} <span className="only-pointer">{t.proofHintPointer}</span>
              <span className="only-touch">{t.proofHintTouch}</span>
            </p>
          </div>
        </article>

        <article className="card card--breakdown" aria-label={t.coverageByCategory}>
          <h3 className="card__title">{t.coverageByCategory}</h3>
          <ul className="bars">
            {result.breakdown.map((b) => {
              const pct = b.total ? Math.round((b.matched / b.total) * 100) : 0;
              return (
                <li key={b.category} className="bar">
                  <span className="bar__label">{t.category[b.category]}</span>
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
              <span className="dot dot--ok" aria-hidden="true" /> {t.matched} <span className="count">{matched.length}</span>
            </h3>
            <ul className="chips" aria-label={t.matchedList}>
              {matched.map((s) =>
                chipButton(
                  s,
                  'chip--ok',
                  <>
                    <IconCheck width={14} height={14} />
                    {name(s)}
                    {s.importance === 'nice' && <span className="chip__tag">{t.tagNice}</span>}
                  </>,
                ),
              )}
              {!matched.length && <li className="muted">{t.noOverlap}</li>}
            </ul>
            {claimed.length > 0 && (
              <>
                <h4 className="skills__sub">
                  {t.claimedTitle} <span className="count">{claimed.length}</span>
                </h4>
                <p className="muted small">{t.claimedHelp}</p>
                <ul className="chips" aria-label={t.claimedList}>
                  {claimed.map((s) =>
                    chipButton(
                      s,
                      'chip--claimed',
                      <>
                        <IconAlert width={14} height={14} />
                        {name(s)}
                        <span className="chip__tag chip__tag--warn">{t.claimedTag}</span>
                      </>,
                    ),
                  )}
                </ul>
              </>
            )}
            <p id={proofId} className={`proof${shownProof?.verified === false ? ' proof--claimed' : ''}`} aria-live="polite" hidden={!shownProof}>
              {shownProof && (
                <>
                  <strong>{name(shownProof)}</strong> · {proofText(shownProof)}
                </>
              )}
            </p>
          </div>
          <div className="skills__col">
            <h3 className="card__title">
              <span className="dot dot--miss" aria-hidden="true" /> {t.missing} <span className="count">{missing.length}</span>
            </h3>
            <ul className="chips" aria-label={t.missingList}>
              {missing.map((s) => (
                <li key={s.name} className={`chip ${s.importance === 'required' ? 'chip--miss' : 'chip--nice'}`}>
                  {s.importance === 'required' ? <IconAlert width={14} height={14} /> : <span className="chip__plus">+</span>}
                  {name(s)}
                  <span className="chip__tag">{s.importance === 'required' ? t.tagRequired : t.tagNice}</span>
                </li>
              ))}
              {!missing.length && <li className="muted">{t.nothingMissing}</li>}
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
        <div role="tablist" aria-label={t.suggestions} className="tabs">
          {TABS.map((tb, i) => (
            <button
              key={tb.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              role="tab"
              id={`${baseId}-tab-${tb.id}`}
              aria-selected={tab === tb.id}
              aria-controls={`${baseId}-panel-${tb.id}`}
              tabIndex={tab === tb.id ? 0 : -1}
              className="tab"
              onClick={() => setTab(tb.id)}
              onKeyDown={(e) => onTabKey(e, i)}
            >
              {tb.icon}
              <span>{tb.label(t)}</span>
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`${baseId}-panel-${tab}`} aria-labelledby={`${baseId}-tab-${tab}`} className="tabpanel" tabIndex={0}>
          {tab === 'bullets' && <Bullets result={result} t={t} />}
          {tab === 'letter' && <CoverLetter result={result} t={t} />}
          {tab === 'interview' && <Interview result={result} t={t} />}
        </div>
      </div>
    </section>
  );
}

function Bullets({ result, t }: { result: AnalysisResult; t: ResultStrings }) {
  if (!result.bulletSuggestions.length) return <p className="muted">{t.noBullets}</p>;
  return (
    <ol className="suggestions">
      {result.bulletSuggestions.map((b, i) => (
        <li key={i} className="suggestion">
          {b.original ? (
            <div className="diff">
              <p className="diff__before">
                <span className="diff__tag">{t.before}</span>
                <span className="diff__text">{b.original}</span>
              </p>
              <p className="diff__after">
                <span className="diff__tag">{t.after}</span>
                <span className="diff__text">
                  <Placeholders text={b.suggestion} />
                </span>
              </p>
            </div>
          ) : (
            <p className="diff__gap">
              <span className="diff__tag diff__tag--gap">{t.gap}</span>
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

function CoverLetter({ result, t }: { result: AnalysisResult; t: ResultStrings }) {
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
          {t.words(words)} · {t.languageName}
        </span>
        <div className="btn-row">
          <button type="button" className="btn btn--ghost" onClick={onCopy}>
            {copied ? <IconCheck /> : <IconCopy />} {copied ? t.copied : t.copy}
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
      <article className="letter__paper" aria-label={t.letterAria}>
        {result.coverLetter.split(/\n{2,}/).map((p, i) => (
          <p key={i}>
            <Placeholders text={p} />
          </p>
        ))}
      </article>
      <p className="muted small">{t.letterDraftNote}</p>
    </div>
  );
}

function Interview({ result, t }: { result: AnalysisResult; t: ResultStrings }) {
  return (
    <ol className="questions">
      {result.interviewQuestions.map((q, i) => (
        <li key={i} className="question">
          <p className="question__q">{q.question}</p>
          <p className="question__why">
            <strong>{t.whyTheyAsk}</strong> {q.why}
          </p>
          <p className="question__tip">
            <strong>{t.tip}</strong> {q.tip}
          </p>
        </li>
      ))}
    </ol>
  );
}
