import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Open sheets, innermost last. Sheets can nest (the time picker opens over the
 * WOD editor), and Escape must close only the one on top.
 */
const openSheets: symbol[] = [];

/** A mobile-first bottom sheet. Slides up from the bottom; tap the scrim to close. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  // Read through a ref so a caller's inline `onClose` doesn't re-register the
  // sheet and shuffle it back to the top of the stack while a child is open.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const id = Symbol('sheet');
    openSheets.push(id);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openSheets[openSheets.length - 1] === id) closeRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      const i = openSheets.indexOf(id);
      if (i !== -1) openSheets.splice(i, 1);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-[1px] animate-[fade_120ms_ease-out]"
        onClick={onClose}
      />
      <div
        className="relative z-10 max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-xl2 border border-hairline bg-card p-5 shadow-pop sm:rounded-xl2"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        role="dialog"
        aria-modal="true"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-hairline sm:hidden" />
        <div className="mb-4 flex items-center justify-between">
          <h3 className="section-title text-lg">{title}</h3>
          <button
            className="rounded-full px-2 text-2xl leading-none text-muted"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="space-y-4">{children}</div>
        {footer && <div className="mt-5 flex gap-3">{footer}</div>}
      </div>
    </div>
  );
}
