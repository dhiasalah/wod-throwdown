import { useEffect, useState } from 'react';
import type { Athlete, Score, Wod, WodType } from '../types';
import { formatTime } from '../lib/format';
import { TimeField } from './TimePicker';

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
  // time — a finished time is held by the picker, not by this text field
  if (mode === 'value') return '';
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

  // Finish times come from the wheel picker, not from `text`.
  const storedTime = wod.type === 'time' && score?.status === 'done' ? score.timeSeconds ?? null : null;

  function commit(nextMode: Mode | null, nextText: string) {
    if (nextMode === null) return onClear();
    if (nextMode === 'absent') return onSet({ ...base, status: 'absent' });
    if (nextMode === 'dnf') return onSet({ ...base, status: 'dnf' });

    // Finish time: keep whatever the picker already stored, else wait for a pick.
    if (wod.type === 'time' && nextMode === 'value') {
      return storedTime != null
        ? onSet({ ...base, status: 'done', timeSeconds: storedTime })
        : onClear();
    }

    // 'value' or 'capped' — persist only when a value parses, else clear (no ghost rows).
    if (wod.type === 'reps' || (wod.type === 'time' && nextMode === 'capped')) {
      const n = parseInt(nextText, 10);
      return Number.isFinite(n) && n >= 0
        ? onSet({ ...base, status: 'done', reps: n })
        : onClear();
    }
    const n = parseFloat(nextText); // load
    return Number.isFinite(n) && n >= 0 ? onSet({ ...base, status: 'done', loadKg: n }) : onClear();
  }

  function commitTime(seconds: number) {
    onSet({ ...base, status: 'done', timeSeconds: seconds });
  }

  function pick(m: Mode) {
    const next = mode === m ? null : m; // tap the active mode again to clear
    setMode(next);
    if (next === 'value' || next === 'capped') {
      // Only carry the text over when it belongs to the mode being re-entered —
      // otherwise switching CAP -> FIN would read "40 reps" as a value.
      const keep = next === deriveMode(wod, score) ? text : '';
      setText(keep);
      commit(next, keep);
    } else {
      setText('');
      commit(next, '');
    }
  }

  const showValueInput = mode === 'value' || mode === 'capped';
  const usePicker = wod.type === 'time' && mode === 'value';
  const valueLabel = wod.type === 'time' && mode === 'capped' ? 'Reps at cap' : VALUE_LABEL[wod.type];
  const placeholder =
    wod.type === 'time' && mode === 'capped' ? 'reps done' : VALUE_PLACEHOLDER[wod.type];
  // Scores saved before a cap existed (or before it was lowered) can sit above it.
  const overCap =
    usePicker && wod.timeCapSeconds != null && storedTime != null && storedTime > wod.timeCapSeconds;

  return (
    <div className="card p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-500 text-ink">{athlete.name}</span>
        <div className="flex shrink-0 gap-1">
          <ModeButton
            label={wod.type === 'time' ? 'Fin' : 'Score'}
            hint={wod.type === 'time' ? MODE_HINT.fin : MODE_HINT.score}
            active={mode === 'value'}
            onClick={() => pick('value')}
          />
          {wod.type === 'time' && (
            <ModeButton label="Cap" hint={MODE_HINT.cap} active={mode === 'capped'} onClick={() => pick('capped')} />
          )}
          <ModeButton label="DNF" hint={MODE_HINT.dnf} active={mode === 'dnf'} onClick={() => pick('dnf')} />
          <ModeButton label="Abs" hint={MODE_HINT.abs} active={mode === 'absent'} onClick={() => pick('absent')} />
        </div>
      </div>

      {showValueInput && (
        <div className="mt-2">
          <div className="label mb-1">{valueLabel}</div>
          {usePicker ? (
            <>
              <TimeField
                value={storedTime}
                onChange={commitTime}
                title={`${athlete.name} — finish time`}
                maxSeconds={wod.timeCapSeconds}
                placeholder="Tap to set time"
                className="h-11 min-h-0 py-2"
              />
              {overCap && (
                <p className="mt-1 text-xs text-crimson">
                  Over the {formatTime(wod.timeCapSeconds!)} cap — retime, or use CAP and enter reps done.
                </p>
              )}
            </>
          ) : (
            <input
              className="field h-11 min-h-0 py-2"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                commit(mode, e.target.value);
              }}
              placeholder={placeholder}
              aria-label={valueLabel}
              inputMode={wod.type === 'load' ? 'decimal' : 'numeric'}
              autoFocus
            />
          )}
        </div>
      )}
    </div>
  );
}

const MODE_HINT = {
  fin: 'Finished before the cap — set the finish time',
  score: 'Enter the result',
  cap: 'Still working when the cap hit — enter reps done',
  dnf: 'Did not finish — stopped early, no valid result',
  abs: 'Absent — did not show up',
} as const;

function ModeButton({
  label,
  hint,
  active,
  onClick,
}: {
  label: string;
  hint: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-lg border px-2.5 py-1.5 text-xs font-600 uppercase tracking-wide transition ${
        active ? 'border-crimson bg-crimson text-white' : 'border-hairline bg-paper text-muted'
      }`}
      onClick={onClick}
      title={hint}
      aria-label={`${label} — ${hint}`}
    >
      {label}
    </button>
  );
}

/**
 * The four scoring codes explained in place — they are the entire scoring
 * interface, and previously appeared with no on-screen explanation at all.
 */
export function ScoreLegend({ type }: { type: WodType }) {
  const items: [string, string][] =
    type === 'time'
      ? [
          ['FIN', 'finished before the cap'],
          ['CAP', 'still working at the cap — enter reps done'],
          ['DNF', 'stopped early'],
          ['ABS', "didn't show"],
        ]
      : [
          ['SCORE', 'the result'],
          ['DNF', 'stopped early'],
          ['ABS', "didn't show"],
        ];

  return (
    <p className="text-xs leading-relaxed text-muted">
      {items.map(([code, meaning], i) => (
        <span key={code}>
          {i > 0 && <span className="px-1.5">·</span>}
          <span className="font-600 text-ink">{code}</span> {meaning}
        </span>
      ))}
    </p>
  );
}
