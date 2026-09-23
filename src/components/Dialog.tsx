import { useEffect, useRef, type ReactNode } from 'react';
import { IconX } from './Icons';

/** Thin wrapper around the native <dialog>: focus trap, Esc and backdrop close for free. */
export function Dialog({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`dialog${wide ? ' dialog--wide' : ''}`}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="dialog__inner">
        <header className="dialog__head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <IconX />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
