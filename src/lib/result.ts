import type { Score, Wod } from '../types';
import { formatTime } from './format';

/** Human-readable result for a score row, given the WOD type. */
export function formatResult(wod: Wod, score: Score | undefined): string {
  if (!score) return '—';
  if (score.status === 'absent') return 'Absent';
  if (score.status === 'dnf') return 'DNF';
  // done
  switch (wod.type) {
    case 'reps':
      return score.reps != null ? `${score.reps} reps` : '—';
    case 'load':
      return score.loadKg != null ? `${score.loadKg} kg` : '—';
    case 'time':
      if (score.timeSeconds != null) return formatTime(score.timeSeconds);
      if (score.reps != null) return `${score.reps} reps (cap)`;
      return '—';
  }
}
