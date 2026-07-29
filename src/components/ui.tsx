import type { ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Small reusable presentation components for the chalkboard design system.
// ---------------------------------------------------------------------------

export function Card({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={`card p-4 ${onClick ? 'cursor-pointer transition active:scale-[0.99]' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3">
      <div className="flex items-end justify-between gap-3">
        <h2 className="section-title">{children}</h2>
        {right}
      </div>
      <div className="hairline-rule mt-1" />
    </div>
  );
}

export function EmptyState({
  icon = '✎',
  title,
  hint,
  action,
}: {
  icon?: string;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-2 border-dashed px-6 py-10 text-center">
      <div className="text-3xl" aria-hidden>
        {icon}
      </div>
      <div className="font-display text-lg font-600 text-ink">{title}</div>
      {hint && <div className="max-w-xs text-sm text-muted">{hint}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Medal badge for the top 3; a quiet numbered disc otherwise. */
export function RankBadge({ rank }: { rank: number }) {
  const medal =
    rank === 1
      ? 'bg-gold text-white border-gold'
      : rank === 2
        ? 'bg-silver text-white border-silver'
        : rank === 3
          ? 'bg-bronze text-white border-bronze'
          : 'bg-paper text-ink border-hairline';
  return (
    <span
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border font-display text-base font-700 ${medal}`}
    >
      {rank}
    </span>
  );
}

/** A colored "marker dot" used to tag divisions on the whiteboard. */
const DIVISION_COLORS = ['#D7263D', '#1B6FB3', '#2E9E5B', '#E4A400', '#8E44AD', '#E67E22'];
export function divisionColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return DIVISION_COLORS[hash % DIVISION_COLORS.length];
}
export function MarkerDot({ id }: { id: string }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: divisionColor(id) }}
      aria-hidden
    />
  );
}

export const WOD_TYPE_LABEL: Record<string, string> = {
  reps: 'Reps / AMRAP',
  time: 'For Time',
  load: 'Max Load',
};

export function TypePill({ type }: { type: string }) {
  return <span className="chip text-xs uppercase tracking-wide">{WOD_TYPE_LABEL[type] ?? type}</span>;
}
