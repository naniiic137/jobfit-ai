import { scoreBand } from '../analyzer/score';
import { resultStrings } from '../i18n';
import type { OutputLanguage } from '../types';

export function ScoreGauge({ score, lang = 'en' }: { score: number; lang?: OutputLanguage }) {
  const band = scoreBand(score);
  const t = resultStrings(lang);
  const label = t.band[band];
  const r = 52;
  const c = 2 * Math.PI * r;
  // 270° arc gauge: the visible track is 75% of the circle.
  const track = c * 0.75;
  const value = track * (Math.max(0, Math.min(100, score)) / 100);
  return (
    <figure className={`gauge gauge--${band}`} aria-label={t.gaugeLabel(score, label)}>
      <svg viewBox="0 0 128 128" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="gauge-grad" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--gauge-a)" />
            <stop offset="100%" stopColor="var(--gauge-b)" />
          </linearGradient>
        </defs>
        <g transform="rotate(135 64 64)">
          <circle cx="64" cy="64" r={r} className="gauge__track" strokeDasharray={`${track} ${c}`} />
          <circle
            cx="64"
            cy="64"
            r={r}
            className="gauge__value"
            stroke="url(#gauge-grad)"
            strokeDasharray={`${value} ${c}`}
          />
        </g>
      </svg>
      <div className="gauge__center">
        <span className="gauge__score">{score}</span>
        <span className="gauge__max">/ 100</span>
      </div>
      <figcaption className="gauge__label">{label}</figcaption>
    </figure>
  );
}
