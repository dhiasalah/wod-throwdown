import { useEffect, useState } from 'react';
import type { Athlete, Score, Wod } from '../types';
import { formatTime, parseTime } from '../lib/format';

// Entry "modes" a user can pick per athlete. They map onto Score.status + fields.
type Mode = 'value' | 'capped' | 'dnf' | 'absent';

function deriveMode(wod: Wod, score: Score | undefined): Mode | null {
  if (!score) return null;
  if (score.status === 'absent') return 'absent';
  if (score.status === 'dnf') return 'dnf';
  // done
  if (wod.type === 'time') return typeof score.timeSeconds === 'number' ? 'value' : 'capped';
  return 'value';
}

function deriveText(wod: Wod, score: Score | undefined, mode: Mode | null): string {
  if (!score || (mode !== 'value' && mode !== 'capped')) return '';
  if (wod.type === 'reps') return score.reps != null ? String(score.reps) : '';
  if (wod.type === 'load') return score.loadKg != null ? String(score.loadKg) : '';
  // time
  if (mode === 'value') return score.timeSeconds != null ? formatTime(score.timeSeconds) : '';
  return score.reps != null ? String(score.reps) : ''; // capped -> reps
}

const VALUE_LABEL: Record<Wod['type'], string> = {
  reps: 'Reps',
  time: 'Finish time',
  load: 'Load (kg)',
};

const VALUE_PLACEHOLDER: Record<Wod['type'], string> = {
  reps: 'e.g. 250',
  time: 'e.g. 8:45',
  load: 'e.g. 180',
};

export function ScoreRow({
  competitionId,
  wod,
  athlete,
  score,
  onSet,
  onClear,
}: {
  competitionId: string;
  wod: Wod;
  athlete: Athlete;
  score: Score | undefined;
  onSet: (s: Score) => void;
  onClear: () => void;
}) {
  const [mode, setMode] = useState<Mode | null>(() => deriveMode(wod, score));
  const [text, setText] = useState<string>(() => deriveText(wod, score, deriveMode(wod, score)));

  // Re-sync if the underlying score changes from elsewhere (import, reset, tab switch).
  useEffect(() => {
    const m = deriveMode(wod, score);
    setMode(m);
    setText(deriveText(wod, score, m));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, wod.id]);

  const base = { competitionId, wodId: wod.id, athleteId: athlete.id } as const;

  function commit(nextMode: Mode | null, nextText: string) {
    if (nextMode === null) return onClear();
    if (nextMode === 'absent') return onSet({ ...base, status: 'absent' });
    if (nextMode === 'dnf') return onSet({ ...base, status: 'dnf' });

    // 'value' or 'capped' — persist only when a value parses, else clear (no ghost rows).
    if (wod.type === 'reps' || (wod.type === 'time' && nextMode === 'capped')) {
      const n = parseInt(nextText, 10);
      return Number.isFinite(n) && n >= 0
        ? onSet({ ...base, status: 'done', reps: n })
        : onClear();
    }
    if (wod.type === 'load') {
      const n = parseFloat(nextText);
      return Number.isFinite(n) && n >= 0
        ? onSet({ ...base, status: 'done', loadKg: n })
        : onClear();
    }
    // time, finished
    const secs = parseTime(nextText);
    return secs != null && secs >= 0
      ? onSet({ ...base, status: 'done', timeSeconds: secs })
      : onClear();
  }

  function pick(m: Mode) {
    const next = mode === m ? null : m; // tap the active mode again to clear
    setMode(next);
    if (next === 'value' || next === 'capped') {
      commit(next, text); // keep existing text
    } else {
      setText('');
      commit(next, '');
    }
  }

  const showValueInput = mode === 'value' || mode === 'capped';
  const valueLabel = wod.type === 'time' && mode === 'capped' ? 'Reps at cap' : VALUE_LABEL[wod.type];
  const placeholder =
    wod.type === 'time' && mode === 'capped' ? 'reps done' : VALUE_PLACEHOLDER[wod.type];

  return (
    <div className="card p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-500 text-ink">{athlete.name}</span>
        <div className="flex shrink-0 gap-1">
          <ModeButton label={wod.type === 'time' ? 'Fin' : 'Score'} active={mode === 'value'} onClick={() => pick('value')} />
          {wod.type === 'time' && (
            <ModeButton label="Cap" active={mode === 'capped'} onClick={() => pick('capped')} />
          )}
          <ModeButton label="DNF" active={mode === 'dnf'} onClick={() => pick('dnf')} />
          <ModeButton label="Abs" active={mode === 'absent'} onClick={() => pick('absent')} />
        </div>
      </div>

      {showValueInput && (
        <div className="mt-2">
          <label className="sr-only">{valueLabel}</label>
          <input
            className="field h-11 min-h-0 py-2"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              commit(mode, e.target.value);
            }}
            placeholder={placeholder}
            inputMode={wod.type === 'load' ? 'decimal' : 'numeric'}
            autoFocus
          />
        </div>
      )}
    </div>
  );
}

function ModeButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      className={`rounded-lg border px-2.5 py-1.5 text-xs font-600 uppercase tracking-wide transition ${
        active ? 'border-crimson bg-crimson text-white' : 'border-hairline bg-paper text-muted'
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
