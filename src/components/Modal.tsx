import { useEffect, type ReactNode } from 'react';

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
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

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
