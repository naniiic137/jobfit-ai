import { scoreBand } from '../analyzer/score';
import type { AnalysisResult } from '../types';
import { Dialog } from './Dialog';
import { IconTrash } from './Icons';

const fmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export function HistoryDialog({
  open,
  onClose,
  history,
  onOpen,
  onRemove,
  onClear,
}: {
  open: boolean;
  onClose: () => void;
  history: AnalysisResult[];
  onOpen: (r: AnalysisResult) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title="History">
      {history.length === 0 ? (
        <p className="muted">No analyses yet. They are kept in this browser only (last 20).</p>
      ) : (
        <>
          <ul className="history">
            {history.map((h) => (
              <li key={h.id} className="history__item">
                <button type="button" className="history__open" onClick={() => onOpen(h)}>
                  <span className={`history__score history__score--${scoreBand(h.scoreDetails.score)}`}>{h.scoreDetails.score}</span>
                  <span className="history__text">
                    <span className="history__title">{h.jobTitle ?? 'Untitled job'}</span>
                    <span className="history__meta">
                      {h.company ? `${h.company} · ` : ''}
                      {fmt.format(new Date(h.createdAt))} · {h.provider} · {h.language.toUpperCase()}
                    </span>
                  </span>
                </button>
                <button type="button" className="icon-btn" aria-label={`Delete ${h.jobTitle ?? 'analysis'}`} onClick={() => onRemove(h.id)}>
                  <IconTrash />
                </button>
              </li>
            ))}
          </ul>
          <footer className="dialog__foot">
            <span className="muted small">Stored in localStorage only.</span>
            <button type="button" className="btn btn--danger" onClick={onClear}>
              <IconTrash /> Clear history
            </button>
          </footer>
        </>
      )}
    </Dialog>
  );
}
